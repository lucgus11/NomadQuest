import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import type {
  AchievementContext,
  ChestNode,
  FogCell,
  InventoryItem,
  LatLng,
  PlayerStats,
} from "@/types";
import * as db from "@/lib/db";
import { cellsInRadius } from "@/lib/fog";
import { haversineDistance } from "@/lib/geoUtils";
import { replenishChests, isChestInReach } from "@/lib/loot";
import { rollArtifact } from "@/data/artifacts";
import type { AchievementDefinition } from "@/types";
import {
  evaluateNewAchievements,
  isNightHour,
  todayKey,
  yesterdayKey,
} from "@/lib/achievementsEngine";
import { XP_PER_ACHIEVEMENT, XP_PER_CELL_REVEALED, XP_PER_CHEST } from "@/lib/xp";

const DEFAULT_STATS: PlayerStats = {
  totalDistanceMeters: 0,
  nightWalkMeters: 0,
  lastPosition: null,
  lastTimestamp: null,
  xp: 0,
  level: 1,
  currentStreakDays: 0,
  lastActiveDay: null,
  maxSpeedKmh: 0,
};

/** Rayon (m) de dissipation du brouillard autour du joueur — personnalisable. */
const DEFAULT_FOG_RADIUS = 30;
/** Un saut GPS plus grand que ça en moins de 3s est considéré comme un
 * artefact de mesure plutôt qu'un déplacement réel. */
const MAX_PLAUSIBLE_JUMP_M = 120;

interface GameState {
  ready: boolean;
  trackingEnabled: boolean;
  fogRadiusMeters: number;

  fogCellKeys: Set<string>;
  chests: ChestNode[];
  inventory: InventoryItem[];
  unlockedAchievementIds: Set<string>;
  stats: PlayerStats;

  lastKnownPosition: LatLng | null;
  lastKnownHeading: number | null;

  pendingAchievements: AchievementDefinition[];
  lastReward: { chestId: string; artifactId: string } | null;

  init: () => Promise<void>;
  setTrackingEnabled: (v: boolean) => void;
  setFogRadius: (m: number) => void;
  recordPosition: (pos: LatLng, timestampMs: number, accuracy: number | null) => Promise<void>;
  setHeading: (heading: number | null) => void;
  openChest: (chestId: string) => Promise<void>;
  dismissAchievement: (id: string) => void;
  clearLastReward: () => void;
  resetAllData: () => Promise<void>;
}

function computeAchievementContext(s: {
  stats: PlayerStats;
  fogCellKeys: Set<string>;
  chests: ChestNode[];
  inventory: InventoryItem[];
}): AchievementContext {
  const openedChests = s.chests.filter((c) => c.openedAt !== null);
  return {
    totalDistanceMeters: s.stats.totalDistanceMeters,
    totalCellsRevealed: s.fogCellKeys.size,
    chestsOpened: openedChests.length,
    legendaryChestsOpened: openedChests.filter((c) => c.kind === "légendaire").length,
    nightWalkMeters: s.stats.nightWalkMeters,
    currentStreakDays: s.stats.currentStreakDays,
    distinctArtifacts: new Set(s.inventory.map((i) => i.artifactId)).size,
    maxSpeedKmh: s.stats.maxSpeedKmh,
  };
}

export const useGameStore = create<GameState>((set, get) => ({
  ready: false,
  trackingEnabled: false,
  fogRadiusMeters: DEFAULT_FOG_RADIUS,

  fogCellKeys: new Set(),
  chests: [],
  inventory: [],
  unlockedAchievementIds: new Set(),
  stats: DEFAULT_STATS,

  lastKnownPosition: null,
  lastKnownHeading: null,

  pendingAchievements: [],
  lastReward: null,

  init: async () => {
    const [fog, chests, inventory, achievements, stats] = await Promise.all([
      db.loadAllFogCells(),
      db.loadAllChests(),
      db.loadInventory(),
      db.loadUnlockedAchievements(),
      db.loadStats(),
    ]);

    set({
      fogCellKeys: new Set(fog.map((c) => c.key)),
      chests,
      inventory,
      unlockedAchievementIds: new Set(achievements.map((a) => a.id)),
      stats: stats ?? DEFAULT_STATS,
      lastKnownPosition: stats?.lastPosition ?? null,
      ready: true,
    });
  },

  setTrackingEnabled: (v) => set({ trackingEnabled: v }),
  setFogRadius: (m) => set({ fogRadiusMeters: m }),
  setHeading: (heading) => set({ lastKnownHeading: heading }),

  recordPosition: async (pos, timestampMs, _accuracy) => {
    const state = get();
    const prevStats = state.stats;
    const now = new Date(timestampMs);

    // --- 1. Distance parcourue (avec filtre anti-saut GPS) ---
    let deltaMeters = 0;
    if (prevStats.lastPosition && prevStats.lastTimestamp) {
      const d = haversineDistance(prevStats.lastPosition, pos);
      const dt = (timestampMs - prevStats.lastTimestamp) / 1000;
      const plausible =
        d <= MAX_PLAUSIBLE_JUMP_M || (dt > 0 && d / Math.max(dt, 1) < 12); // < 12 m/s ~ 43km/h
      if (plausible) deltaMeters = d;
    }

    const speedKmh =
      prevStats.lastTimestamp && deltaMeters > 0
        ? (deltaMeters / ((timestampMs - prevStats.lastTimestamp) / 1000)) * 3.6
        : prevStats.maxSpeedKmh;

    const isNight = isNightHour(now);
    const today = todayKey(now);
    let streak = prevStats.currentStreakDays;
    if (prevStats.lastActiveDay !== today) {
      streak = prevStats.lastActiveDay === yesterdayKey(now) ? streak + 1 : 1;
    }

    // --- 2. Dissipation du brouillard ---
    const candidateCells = cellsInRadius(pos, state.fogRadiusMeters);
    const newCells: FogCell[] = candidateCells.filter(
      (c) => !state.fogCellKeys.has(c.key)
    );

    let xpGain = 0;
    let nextFogKeys = state.fogCellKeys;
    if (newCells.length > 0) {
      nextFogKeys = new Set(state.fogCellKeys);
      for (const c of newCells) nextFogKeys.add(c.key);
      xpGain += newCells.length * XP_PER_CELL_REVEALED;
      void db.saveFogCells(newCells);
    }

    // --- 3. Renouvellement des coffres ---
    const newChests = replenishChests(state.chests, pos, state.lastKnownHeading);
    const nextChests = newChests.length > 0 ? [...state.chests, ...newChests] : state.chests;
    if (newChests.length > 0) void db.saveChests(newChests);

    // --- 4. Stats mises à jour ---
    const nextStats: PlayerStats = {
      totalDistanceMeters: prevStats.totalDistanceMeters + deltaMeters,
      nightWalkMeters: prevStats.nightWalkMeters + (isNight ? deltaMeters : 0),
      lastPosition: pos,
      lastTimestamp: timestampMs,
      xp: prevStats.xp + xpGain,
      level: prevStats.level,
      currentStreakDays: streak,
      lastActiveDay: today,
      maxSpeedKmh: Math.max(prevStats.maxSpeedKmh, Math.min(speedKmh, 40)),
    };

    // --- 5. Évaluation des succès ---
    const ctx = computeAchievementContext({
      stats: nextStats,
      fogCellKeys: nextFogKeys,
      chests: nextChests,
      inventory: state.inventory,
    });
    const newlyUnlocked = evaluateNewAchievements(ctx, state.unlockedAchievementIds);
    let nextUnlockedIds = state.unlockedAchievementIds;
    if (newlyUnlocked.length > 0) {
      nextUnlockedIds = new Set(state.unlockedAchievementIds);
      for (const a of newlyUnlocked) {
        nextUnlockedIds.add(a.id);
        nextStats.xp += XP_PER_ACHIEVEMENT;
        void db.unlockAchievement(a.id);
      }
    }

    set({
      lastKnownPosition: pos,
      fogCellKeys: nextFogKeys,
      chests: nextChests,
      stats: nextStats,
      unlockedAchievementIds: nextUnlockedIds,
      pendingAchievements: newlyUnlocked.length
        ? [...state.pendingAchievements, ...newlyUnlocked]
        : state.pendingAchievements,
    });

    void db.saveStats(nextStats);
  },

  openChest: async (chestId) => {
    const state = get();
    const chest = state.chests.find((c) => c.id === chestId);
    if (!chest || chest.openedAt !== null || !state.lastKnownPosition) return;
    if (!isChestInReach(state.lastKnownPosition, chest)) return;

    const artifact = rollArtifact(chest.kind);
    const item: InventoryItem = {
      uid: uuidv4(),
      artifactId: artifact.id,
      collectedAt: Date.now(),
      collectedAt_position: state.lastKnownPosition,
    };

    const updatedChest: ChestNode = {
      ...chest,
      openedAt: Date.now(),
      rewardArtifactId: artifact.id,
    };
    const nextChests = state.chests.map((c) => (c.id === chestId ? updatedChest : c));
    const nextInventory = [...state.inventory, item];
    const nextStats: PlayerStats = {
      ...state.stats,
      xp: state.stats.xp + XP_PER_CHEST[chest.kind],
    };

    const ctx = computeAchievementContext({
      stats: nextStats,
      fogCellKeys: state.fogCellKeys,
      chests: nextChests,
      inventory: nextInventory,
    });
    const newlyUnlocked = evaluateNewAchievements(ctx, state.unlockedAchievementIds);
    let nextUnlockedIds = state.unlockedAchievementIds;
    if (newlyUnlocked.length > 0) {
      nextUnlockedIds = new Set(state.unlockedAchievementIds);
      for (const a of newlyUnlocked) {
        nextUnlockedIds.add(a.id);
        nextStats.xp += XP_PER_ACHIEVEMENT;
        void db.unlockAchievement(a.id);
      }
    }

    set({
      chests: nextChests,
      inventory: nextInventory,
      stats: nextStats,
      unlockedAchievementIds: nextUnlockedIds,
      lastReward: { chestId, artifactId: artifact.id },
      pendingAchievements: newlyUnlocked.length
        ? [...state.pendingAchievements, ...newlyUnlocked]
        : state.pendingAchievements,
    });

    await Promise.all([
      db.saveChest(updatedChest),
      db.addInventoryItem(item),
      db.saveStats(nextStats),
    ]);
  },

  dismissAchievement: (id) =>
    set((s) => ({ pendingAchievements: s.pendingAchievements.filter((a) => a.id !== id) })),

  clearLastReward: () => set({ lastReward: null }),

  resetAllData: async () => {
    await db.wipeAllData();
    set({
      fogCellKeys: new Set(),
      chests: [],
      inventory: [],
      unlockedAchievementIds: new Set(),
      stats: DEFAULT_STATS,
      lastKnownPosition: null,
      pendingAchievements: [],
      lastReward: null,
    });
  },
}));
