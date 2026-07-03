import type { ChestKind, ChestNode, LatLng } from "@/types";
import { destinationPoint, haversineDistance } from "@/lib/geoUtils";

export const CHEST_OPEN_RADIUS_METERS = 10;
/** Distance minimale / maximale à laquelle un coffre apparaît autour du
 * joueur : assez loin pour motiver la marche, assez proche pour rester
 * atteignable en quelques minutes. */
const SPAWN_MIN_METERS = 60;
const SPAWN_MAX_METERS = 220;
const TARGET_ACTIVE_CHESTS = 5;

function rollChestKind(): ChestKind {
  const roll = Math.random();
  if (roll > 0.97) return "légendaire";
  if (roll > 0.8) return "rare";
  return "commun";
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/** Génère un nouveau coffre à une position aléatoire dans une couronne
 * (anneau) autour du joueur, biaisée légèrement vers son cap de marche. */
export function spawnChestNear(
  playerPos: LatLng,
  headingDeg: number | null
): ChestNode {
  const distance = randomBetween(SPAWN_MIN_METERS, SPAWN_MAX_METERS);
  // Biais de +-70° autour du cap de marche si connu, sinon totalement aléatoire.
  const bearing =
    headingDeg !== null
      ? headingDeg + randomBetween(-70, 70)
      : randomBetween(0, 360);

  const position = destinationPoint(playerPos, distance, bearing);

  return {
    id: crypto.randomUUID(),
    position,
    kind: rollChestKind(),
    createdAt: Date.now(),
    openedAt: null,
    rewardArtifactId: null,
  };
}

/** Maintient un nombre cible de coffres actifs autour du joueur : complète
 * le pool si des coffres ont été ouverts ou sont devenus trop lointains. */
export function replenishChests(
  existing: ChestNode[],
  playerPos: LatLng,
  headingDeg: number | null
): ChestNode[] {
  const active = existing.filter(
    (c) =>
      c.openedAt === null &&
      haversineDistance(c.position, playerPos) < SPAWN_MAX_METERS * 3
  );

  const toSpawn = Math.max(0, TARGET_ACTIVE_CHESTS - active.length);
  const newChests: ChestNode[] = [];
  for (let i = 0; i < toSpawn; i++) {
    newChests.push(spawnChestNear(playerPos, headingDeg));
  }
  return newChests;
}

export function distanceToChest(playerPos: LatLng, chest: ChestNode): number {
  return haversineDistance(playerPos, chest.position);
}

export function isChestInReach(playerPos: LatLng, chest: ChestNode): boolean {
  return distanceToChest(playerPos, chest) <= CHEST_OPEN_RADIUS_METERS;
}
