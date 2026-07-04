import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import type {
  AchievementContext,
  AchievementDefinition,
  ChestNode,
  FogCell,
  InventoryItem,
  LatLng,
  OpenedChestRecord,
  PlayerStats,
} from "@/types";
import * as db from "@/lib/db";
import { cellsInRadius } from "@/lib/fog";
import { haversineDistance } from "@/lib/geoUtils";
import { isChestInReach } from "@/lib/loot";
import { generateChestsInBounds, type LatLngBounds } from "@/lib/chestField";
import { rollArtifact } from "@/data/artifacts";
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
/** Un saut GPS plus grand que ça en moins d'une seconde est considéré comme
 * un artefact de mesure plutôt qu'un déplacement réel. */
const MAX_PLAUSIBLE_JUMP_M = 120;
/** Au-delà de cette précision (m), on ne fait plus confiance au signal pour
 * révéler du brouillard ou compter de la distance (sauf tout premier fix). */
const ACCURACY_REVEAL_THRESHOLD_M = 100;
/** Vitesse (km/h) au-delà de laquelle un échantillon est jugé aberrant pour
 * la marche/course à pied (bruit GPS) et ignoré pour la distance/vitesse. */
const IMPLAUSIBLE_WALK_SPEED_KMH = 35;
/** Délai minimal (s) entre deux points pour calculer une vitesse fiable —
 * en dessous, le bruit GPS domine largement le signal. */
const MIN_INTERVAL_FOR_SPEED_S = 1.5;

interface GameState {
  ready: boolean;
  trackingEnabled: boolean;
  fogRadiusMeters: number;

  fogCellKeys: Set<string>;
  chests: ChestNode[];
  chestsLoading: boolean;
  roadDataAvailable: boolean | null; // null = pas encore su
  inventory: InventoryItem[];
  openedChestIds: Set<string>;
  unlockedAchievementIds: Set<string>;
  stats: PlayerStats;

  lastKnownPosition: LatLng | null;
  lastKnownHeading: number | null;
  lastKnownAccuracy: number | null;

  pendingAchievements: AchievementDefinition[];
  lastReward: { chestId: string; artifactId: string; kind: ChestNode["kind"] } | null;

  init: () => Promise<void>;
  setTrackingEnabled: (v: boolean) => void;
  setFogRadius: (m: number) => void;
  recordPosition: (
    pos: LatLng,
    timestampMs: number,
    accuracy: number | null,
    deviceSpeedKmh?: number | null
  ) => Promise<void>;
  setHeading: (heading: number | null) => void;
  refreshChestsForBounds: (bounds: LatLngBounds) => Promise<void>;
  openChest: (chestId: string) => Promise<void>;
  dismissAchievement: (id: string) => void;
  clearLastReward: () => void;
  resetAllData: () => Promise<void>;
}

function computeAchievementContext(s: {
  stats: PlayerStats;
  fogCellKeys: Set<string>;
  openedChests: OpenedChestRecord[];
  inventory: InventoryItem[];
}): AchievementContext {
  return {
    totalDistanceMeters: s.stats.totalDistanceMeters,
    totalCellsRevealed: s.fogCellKeys.size,
    chestsOpened: s.openedChests.length,
    legendaryChestsOpened: s.openedChests.filter((c) => c.kind === "légendaire").length,
    nightWalkMeters: s.stats.nightWalkMeters,
    currentStreakDays: s.stats.currentStreakDays,
    distinctArtifacts: new Set(s.inventory.map((i) => i.artifactId)).size,
    maxSpeedKmh: s.stats.maxSpeedKmh,
  };
}

let openedChestsCache: OpenedChestRecord[] = [];

export const useGameStore = create<GameState>((set, get) => ({
  ready: false,
  trackingEnabled: false,
  fogRadiusMeters: DEFAULT_FOG_RADIUS,

  fogCellKeys: new Set(),
  chests: [],
  chestsLoading: false,
  roadDataAvailable: null,
  inventory: [],
  openedChestIds: new Set(),
  unlockedAchievementIds: new Set(),
  stats: DEFAULT_STATS,

  lastKnownPosition: null,
  lastKnownHeading: null,
  lastKnownAccuracy: null,

  pendingAchievements: [],
  lastReward: null,

  init: async () => {
    const [fog, inventory, openedChests, achievements, stats] = await Promise.all([
      db.loadAllFogCells(),
      db.loadInventory(),
      db.loadOpenedChests(),
      db.loadUnlockedAchievements(),
      db.loadStats(),
    ]);

    openedChestsCache = openedChests;

    set({
      fogCellKeys: new Set(fog.map((c) => c.key)),
      inventory,
      openedChestIds: new Set(openedChests.map((c) => c.id)),
      unlockedAchievementIds: new Set(achievements.map((a) => a.id)),
      stats: stats ?? DEFAULT_STATS,
      lastKnownPosition: stats?.lastPosition ?? null,
      ready: true,
    });
  },

  setTrackingEnabled: (v) => set({ trackingEnabled: v }),
  setFogRadius: (m) => set({ fogRadiusMeters: m }),
  setHeading: (heading) => set({ lastKnownHeading: heading }),

  recordPosition: async (pos, timestampMs, accuracy, deviceSpeedKmh) => {
    const state = get();
    const prevStats = state.stats;
    const now = new Date(timestampMs);
    const isFirstFix = prevStats.lastPosition === null;

    // Précision suffisante pour faire confiance à la mesure (distance, brouillard).
    // Le tout premier signal est toujours accepté pour "amorcer" la carte, même
    // imprécis (sans quoi certains appareils/navigateurs — GPS faible, PC de
    // bureau — resteraient bloqués sur un écran de brouillard sans jamais se
    // centrer ni rien révéler).
    const accuracyOk = accuracy === null || accuracy <= ACCURACY_REVEAL_THRESHOLD_M;
    const canTrustFix = isFirstFix || accuracyOk;

    // --- 1. Distance parcourue, avec filtre anti-bruit GPS ---
    // On ne fait avancer l'"ancre" de calcul (lastPosition/lastTimestamp) que
    // lors d'un déplacement jugé réel. Sans ce filtre, le bruit GPS habituel
    // (le point mesuré "tremble" de quelques mètres même à l'arrêt) finit
    // par s'accumuler en kilomètres fantômes au fil du temps.
    const rawDistance = prevStats.lastPosition ? haversineDistance(prevStats.lastPosition, pos) : 0;
    const rawIntervalS = prevStats.lastTimestamp
      ? (timestampMs - prevStats.lastTimestamp) / 1000
      : 0;
    const stationaryThresholdM = Math.max(6, Math.min(25, (accuracy ?? 15) * 0.7));
    const isMeaningfulMove =
      prevStats.lastPosition !== null && rawDistance >= stationaryThresholdM;

    let deltaMeters = 0;
    let nextAnchorPos = prevStats.lastPosition ?? pos;
    let nextAnchorTs = prevStats.lastTimestamp ?? timestampMs;
    let speedSampleKmh: number | null = null;

    if (!prevStats.lastPosition) {
      nextAnchorPos = pos;
      nextAnchorTs = timestampMs;
    } else if (isMeaningfulMove && accuracyOk) {
      const impliedSpeedKmh = rawIntervalS > 0 ? (rawDistance / rawIntervalS) * 3.6 : 0;
      const plausible = rawDistance <= MAX_PLAUSIBLE_JUMP_M && impliedSpeedKmh < 45;

      if (plausible) {
        deltaMeters = rawDistance;
        if (rawIntervalS >= MIN_INTERVAL_FOR_SPEED_S) {
          speedSampleKmh =
            deviceSpeedKmh !== null && deviceSpeedKmh !== undefined && deviceSpeedKmh >= 0
              ? deviceSpeedKmh
              : impliedSpeedKmh;
        }
      }
      nextAnchorPos = pos;
      nextAnchorTs = timestampMs;
    }
    // Si le mouvement n'est pas jugé significatif, l'ancre ne bouge pas : le
    // prochain fix sera comparé à la même référence, donc le bruit ne
    // s'accumule pas silencieusement.

    const isNight = isNightHour(now);
    const today = todayKey(now);
    let streak = prevStats.currentStreakDays;
    if (prevStats.lastActiveDay !== today) {
      streak = prevStats.lastActiveDay === yesterdayKey(now) ? streak + 1 : 1;
    }

    // --- 2. Dissipation du brouillard ---
    const revealRadius = isFirstFix ? Math.max(state.fogRadiusMeters, 50) : state.fogRadiusMeters;
    const candidateCells = canTrustFix ? cellsInRadius(pos, revealRadius) : [];
    const newCells: FogCell[] = candidateCells.filter((c) => !state.fogCellKeys.has(c.key));

    let xpGain = 0;
    let nextFogKeys = state.fogCellKeys;
    if (newCells.length > 0) {
      nextFogKeys = new Set(state.fogCellKeys);
      for (const c of newCells) nextFogKeys.add(c.key);
      xpGain += newCells.length * XP_PER_CELL_REVEALED;
      void db.saveFogCells(newCells);
    }

    // --- 3. Stats mises à jour ---
    const nextMaxSpeed =
      speedSampleKmh !== null && speedSampleKmh < IMPLAUSIBLE_WALK_SPEED_KMH
        ? Math.max(prevStats.maxSpeedKmh, speedSampleKmh)
        : prevStats.maxSpeedKmh;

    const nextStats: PlayerStats = {
      totalDistanceMeters: prevStats.totalDistanceMeters + deltaMeters,
      nightWalkMeters: prevStats.nightWalkMeters + (isNight ? deltaMeters : 0),
      lastPosition: nextAnchorPos,
      lastTimestamp: nextAnchorTs,
      xp: prevStats.xp + xpGain,
      level: prevStats.level,
      currentStreakDays: streak,
      lastActiveDay: today,
      maxSpeedKmh: nextMaxSpeed,
    };

    // --- 4. Évaluation des succès ---
    const ctx = computeAchievementContext({
      stats: nextStats,
      fogCellKeys: nextFogKeys,
      openedChests: openedChestsCache,
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
      lastKnownAccuracy: accuracy,
      fogCellKeys: nextFogKeys,
      stats: nextStats,
      unlockedAchievementIds: nextUnlockedIds,
      pendingAchievements: newlyUnlocked.length
        ? [...state.pendingAchievements, ...newlyUnlocked]
        : state.pendingAchievements,
    });

    void db.saveStats(nextStats);
  },

  refreshChestsForBounds: async (bounds) => {
    const state = get();
    set({ chestsLoading: true });
    try {
      const { chests, roadDataAvailable } = await generateChestsInBounds(
        bounds,
        state.openedChestIds
      );
      set({ chests, roadDataAvailable, chestsLoading: false });
    } catch {
      set({ chestsLoading: false, roadDataAvailable: false });
    }
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

    const record: OpenedChestRecord = {
      id: chest.id,
      kind: chest.kind,
      rewardArtifactId: artifact.id,
      openedAt: Date.now(),
      position: chest.position,
    };

    const nextChests = state.chests.filter((c) => c.id !== chestId);
    const nextOpenedIds = new Set(state.openedChestIds);
    nextOpenedIds.add(chestId);
    const nextInventory = [...state.inventory, item];
    const nextStats: PlayerStats = {
      ...state.stats,
      xp: state.stats.xp + XP_PER_CHEST[chest.kind],
    };

    openedChestsCache = [...openedChestsCache, record];

    const ctx = computeAchievementContext({
      stats: nextStats,
      fogCellKeys: state.fogCellKeys,
      openedChests: openedChestsCache,
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
      openedChestIds: nextOpenedIds,
      inventory: nextInventory,
      stats: nextStats,
      unlockedAchievementIds: nextUnlockedIds,
      lastReward: { chestId, artifactId: artifact.id, kind: chest.kind },
      pendingAchievements: newlyUnlocked.length
        ? [...state.pendingAchievements, ...newlyUnlocked]
        : state.pendingAchievements,
    });

    await Promise.all([
      db.recordOpenedChest(record),
      db.addInventoryItem(item),
      db.saveStats(nextStats),
    ]);
  },

  dismissAchievement: (id) =>
    set((s) => ({ pendingAchievements: s.pendingAchievements.filter((a) => a.id !== id) })),

  clearLastReward: () => set({ lastReward: null }),

  resetAllData: async () => {
    await db.wipeAllData();
    openedChestsCache = [];
    set({
      fogCellKeys: new Set(),
      chests: [],
      openedChestIds: new Set(),
      inventory: [],
      unlockedAchievementIds: new Set(),
      stats: DEFAULT_STATS,
      lastKnownPosition: null,
      lastKnownAccuracy: null,
      pendingAchievements: [],
      lastReward: null,
    });
  },
}));
