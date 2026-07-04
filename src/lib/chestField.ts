import type { ChestKind, ChestNode, LatLng } from "@/types";
import { METERS_PER_DEGREE_LAT, metersPerDegreeLng } from "@/lib/geoUtils";
import { rand01 } from "@/lib/prng";
import { ensureRoadDataForBounds, nearestPointOnRoads } from "@/lib/roadNetwork";

/** Taille d'une cellule de la grille de butin — un coffre potentiel par
 * cellule d'environ 110 m de côté. Suffisamment dense pour croiser
 * régulièrement des coffres en marchant, sans en avoir un à chaque pas. */
export const LOOT_CELL_METERS = 110;

/** Probabilité qu'une cellule donnée contienne effectivement un coffre —
 * déterministe (toujours vrai/faux pour les mêmes coordonnées). */
const SPAWN_PROBABILITY = 0.24;

/** Distance max entre le tirage procédural et la route/chemin le plus proche
 * pour qu'un coffre y soit ancré. Au-delà, la cellule est ignorée plutôt que
 * de risquer un coffre en pleine propriété privée. */
const ROAD_SNAP_MAX_DISTANCE_M = 30;

function rollKind(gx: number, gy: number): ChestKind {
  const roll = rand01(gx, gy, 2);
  if (roll > 0.965) return "légendaire";
  if (roll > 0.78) return "rare";
  return "commun";
}

function latLngToLootCell(pos: LatLng): { gx: number; gy: number } {
  const mPerLng = metersPerDegreeLng(pos.lat);
  return {
    gx: Math.floor((pos.lng * mPerLng) / LOOT_CELL_METERS),
    gy: Math.floor((pos.lat * METERS_PER_DEGREE_LAT) / LOOT_CELL_METERS),
  };
}

function cellRawPosition(gx: number, gy: number, refLat: number): LatLng {
  const mPerLng = metersPerDegreeLng(refLat);
  const jitterX = rand01(gx, gy, 3);
  const jitterY = rand01(gx, gy, 4);
  const originLat = (gy * LOOT_CELL_METERS) / METERS_PER_DEGREE_LAT;
  const originLng = (gx * LOOT_CELL_METERS) / mPerLng;
  return {
    lat: originLat + (jitterY * LOOT_CELL_METERS) / METERS_PER_DEGREE_LAT,
    lng: originLng + (jitterX * LOOT_CELL_METERS) / mPerLng,
  };
}

export const CHEST_OPEN_RADIUS_METERS = 10;

export interface LatLngBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

/** Génère tous les coffres "potentiels" de la zone visible, puis les ancre
 * sur le réseau routier public le plus proche (routes, rues, chemins,
 * sentiers, pistes forestières). Une cellule sans route publique à moins de
 * {@link ROAD_SNAP_MAX_DISTANCE_M} mètres ne génère aucun coffre. Si aucune
 * donnée routière n'est disponible pour la zone (hors-ligne, jamais visitée),
 * retourne un tableau vide plutôt que de placer des coffres au hasard. */
export async function generateChestsInBounds(
  bounds: LatLngBounds,
  openedIds: ReadonlySet<string>
): Promise<{ chests: ChestNode[]; roadDataAvailable: boolean }> {
  const roadSegments = await ensureRoadDataForBounds(bounds);
  if (!roadSegments) {
    return { chests: [], roadDataAvailable: false };
  }

  const refLat = (bounds.north + bounds.south) / 2;
  const nwCell = latLngToLootCell({ lat: bounds.north, lng: bounds.west });
  const seCell = latLngToLootCell({ lat: bounds.south, lng: bounds.east });

  const gxMin = Math.min(nwCell.gx, seCell.gx) - 1;
  const gxMax = Math.max(nwCell.gx, seCell.gx) + 1;
  const gyMin = Math.min(nwCell.gy, seCell.gy) - 1;
  const gyMax = Math.max(nwCell.gy, seCell.gy) + 1;

  // Garde-fou : si la zone demandée est démesurée (dézoom extrême), on
  // n'essaie pas de tirer des dizaines de milliers de cellules d'un coup.
  const totalCells = (gxMax - gxMin + 1) * (gyMax - gyMin + 1);
  if (totalCells > 20000) {
    return { chests: [], roadDataAvailable: true };
  }

  const chests: ChestNode[] = [];
  for (let gx = gxMin; gx <= gxMax; gx++) {
    for (let gy = gyMin; gy <= gyMax; gy++) {
      const spawnRoll = rand01(gx, gy, 1);
      if (spawnRoll > SPAWN_PROBABILITY) continue;

      const id = `chest:${gx}:${gy}`;
      if (openedIds.has(id)) continue;

      const rawPosition = cellRawPosition(gx, gy, refLat);
      const snapped = nearestPointOnRoads(rawPosition, roadSegments, ROAD_SNAP_MAX_DISTANCE_M);
      if (!snapped) continue; // pas de voie publique assez proche : on n'y place rien

      chests.push({
        id,
        position: snapped.point,
        kind: rollKind(gx, gy),
        openedAt: null,
        rewardArtifactId: null,
      });
    }
  }

  return { chests, roadDataAvailable: true };
}
