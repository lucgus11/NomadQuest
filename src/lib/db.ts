import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type {
  FogCell,
  InventoryItem,
  OpenedChestRecord,
  PlayerStats,
  RoadTileCache,
  UnlockedAchievement,
} from "@/types";

const DB_NAME = "nomadquest-db";
const DB_VERSION = 2;

interface NomadQuestDB extends DBSchema {
  fog: {
    key: string;
    value: FogCell;
  };
  inventory: {
    key: string;
    value: InventoryItem;
  };
  /** @deprecated conservé pour compatibilité de migration ascendante avec la
   * v1 (coffres non ouverts persistés) — plus alimenté depuis la v2. */
  chests: {
    key: string;
    value: unknown;
  };
  openedChests: {
    key: string;
    value: OpenedChestRecord;
  };
  roadTiles: {
    key: string;
    value: RoadTileCache;
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
          db.createObjectStore("chests", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("openedChests")) {
          db.createObjectStore("openedChests", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("roadTiles")) {
          db.createObjectStore("roadTiles", { keyPath: "key" });
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

export async function recordOpenedChest(record: OpenedChestRecord): Promise<void> {
  const db = await getDB();
  await db.put("openedChests", record);
}

export async function loadOpenedChests(): Promise<OpenedChestRecord[]> {
  const db = await getDB();
  return db.getAll("openedChests");
}

/* ------------------------------ Cache routier ----------------------------- */

export async function getRoadTile(key: string): Promise<RoadTileCache | undefined> {
  const db = await getDB();
  return db.get("roadTiles", key);
}

export async function saveRoadTile(tile: RoadTileCache): Promise<void> {
  const db = await getDB();
  await db.put("roadTiles", tile);
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
    db.clear("openedChests"),
    db.clear("achievements"),
    db.clear("meta"),
    // On conserve volontairement le cache routier (roadTiles) lors d'une
    // réinitialisation de la progression : ce ne sont que des données
    // publiques (OSM), pas de la progression du joueur.
  ]);
}

export async function exportAllData() {
  const db = await getDB();
  const [fog, inventory, openedChests, achievements, stats] = await Promise.all([
    db.getAll("fog"),
    db.getAll("inventory"),
    db.getAll("openedChests"),
    db.getAll("achievements"),
    db.get("meta", STATS_KEY),
  ]);
  return { fog, inventory, openedChests, achievements, stats, exportedAt: Date.now() };
}
