import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type {
  ChestNode,
  FogCell,
  InventoryItem,
  PlayerStats,
  UnlockedAchievement,
} from "@/types";

const DB_NAME = "nomadquest-db";
const DB_VERSION = 1;

interface NomadQuestDB extends DBSchema {
  fog: {
    key: string;
    value: FogCell;
  };
  inventory: {
    key: string;
    value: InventoryItem;
  };
  chests: {
    key: string;
    value: ChestNode;
    indexes: { "by-opened": number };
  };
  achievements: {
    key: string;
    value: UnlockedAchievement;
  };
  meta: {
    key: string;
    value: unknown;
  };
}

let dbPromise: Promise<IDBPDatabase<NomadQuestDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<NomadQuestDB>> {
  if (!dbPromise) {
    dbPromise = openDB<NomadQuestDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("fog")) {
          db.createObjectStore("fog", { keyPath: "key" });
        }
        if (!db.objectStoreNames.contains("inventory")) {
          db.createObjectStore("inventory", { keyPath: "uid" });
        }
        if (!db.objectStoreNames.contains("chests")) {
          const store = db.createObjectStore("chests", { keyPath: "id" });
          store.createIndex("by-opened", "openedAt");
        }
        if (!db.objectStoreNames.contains("achievements")) {
          db.createObjectStore("achievements", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("meta")) {
          db.createObjectStore("meta");
        }
      },
    });
  }
  return dbPromise;
}

/* ------------------------------ Fog of War ------------------------------ */

export async function saveFogCells(cells: FogCell[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("fog", "readwrite");
  await Promise.all([...cells.map((c) => tx.store.put(c)), tx.done]);
}

export async function loadAllFogCells(): Promise<FogCell[]> {
  const db = await getDB();
  return db.getAll("fog");
}

/* ------------------------------ Inventaire ------------------------------ */

export async function addInventoryItem(item: InventoryItem): Promise<void> {
  const db = await getDB();
  await db.put("inventory", item);
}

export async function loadInventory(): Promise<InventoryItem[]> {
  const db = await getDB();
  return db.getAll("inventory");
}

/* -------------------------------- Coffres -------------------------------- */

export async function saveChest(chest: ChestNode): Promise<void> {
  const db = await getDB();
  await db.put("chests", chest);
}

export async function saveChests(chests: ChestNode[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("chests", "readwrite");
  await Promise.all([...chests.map((c) => tx.store.put(c)), tx.done]);
}

export async function loadAllChests(): Promise<ChestNode[]> {
  const db = await getDB();
  return db.getAll("chests");
}

/* ----------------------------- Succès (achv) ----------------------------- */

export async function unlockAchievement(id: string): Promise<void> {
  const db = await getDB();
  await db.put("achievements", { id, unlockedAt: Date.now() });
}

export async function loadUnlockedAchievements(): Promise<
  UnlockedAchievement[]
> {
  const db = await getDB();
  return db.getAll("achievements");
}

/* -------------------------- Stats du joueur (meta) ------------------------- */

const STATS_KEY = "player-stats";

export async function saveStats(stats: PlayerStats): Promise<void> {
  const db = await getDB();
  await db.put("meta", stats, STATS_KEY);
}

export async function loadStats(): Promise<PlayerStats | undefined> {
  const db = await getDB();
  return (await db.get("meta", STATS_KEY)) as PlayerStats | undefined;
}

/* ------------------------------ Export / Reset ----------------------------- */

export async function wipeAllData(): Promise<void> {
  const db = await getDB();
  await Promise.all([
    db.clear("fog"),
    db.clear("inventory"),
    db.clear("chests"),
    db.clear("achievements"),
    db.clear("meta"),
  ]);
}

export async function exportAllData() {
  const db = await getDB();
  const [fog, inventory, chests, achievements, stats] = await Promise.all([
    db.getAll("fog"),
    db.getAll("inventory"),
    db.getAll("chests"),
    db.getAll("achievements"),
    db.get("meta", STATS_KEY),
  ]);
  return { fog, inventory, chests, achievements, stats, exportedAt: Date.now() };
}
