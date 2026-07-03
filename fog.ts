import type { FogCell, LatLng } from "@/types";
import { METERS_PER_DEGREE_LAT, metersPerDegreeLng } from "@/lib/geoUtils";

/** Taille d'une cellule de la grille de brouillard, en mètres.
 * Plus petit = dissipation plus fine mais plus de cellules à stocker/dessiner. */
export const FOG_CELL_SIZE_METERS = 10;

export function latLngToCell(pos: LatLng): { gx: number; gy: number } {
  const mPerLng = metersPerDegreeLng(pos.lat);
  const gx = Math.floor((pos.lng * mPerLng) / FOG_CELL_SIZE_METERS);
  const gy = Math.floor(
    (pos.lat * METERS_PER_DEGREE_LAT) / FOG_CELL_SIZE_METERS
  );
  return { gx, gy };
}

export function cellToLatLng(gx: number, gy: number, refLat: number): LatLng {
  const mPerLng = metersPerDegreeLng(refLat);
  return {
    lng: (gx * FOG_CELL_SIZE_METERS) / mPerLng,
    lat: (gy * FOG_CELL_SIZE_METERS) / METERS_PER_DEGREE_LAT,
  };
}

export function cellKey(gx: number, gy: number): string {
  return `${gx}:${gy}`;
}

/** Retourne toutes les cellules situées dans un rayon (m) autour d'un point,
 * en approximant le disque via la grille locale. */
export function cellsInRadius(
  center: LatLng,
  radiusMeters: number
): FogCell[] {
  const { gx: cgx, gy: cgy } = latLngToCell(center);
  const cellRadius = Math.ceil(radiusMeters / FOG_CELL_SIZE_METERS);
  const now = Date.now();
  const cells: FogCell[] = [];

  for (let dx = -cellRadius; dx <= cellRadius; dx++) {
    for (let dy = -cellRadius; dy <= cellRadius; dy++) {
      if (dx * dx + dy * dy > cellRadius * cellRadius) continue;
      const gx = cgx + dx;
      const gy = cgy + dy;
      cells.push({ key: cellKey(gx, gy), gx, gy, revealedAt: now });
    }
  }
  return cells;
}
