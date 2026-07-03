import { FOG_CELL_SIZE_METERS } from "@/lib/fog";

/** Surface des terres émergées de la planète, en m² (~148,9 millions de km²). */
export const WORLD_LAND_AREA_M2 = 148_900_000 * 1_000_000;

/** Rayon (m) de la "zone locale" de référence utilisée pour le % de zone
 * découverte — approxime une petite ville / un quartier étendu. */
export const LOCAL_ZONE_RADIUS_M = 3000;

export const CELL_AREA_M2 = FOG_CELL_SIZE_METERS * FOG_CELL_SIZE_METERS;

export function revealedAreaM2(cellCount: number): number {
  return cellCount * CELL_AREA_M2;
}

export function localZonePercent(cellCount: number): number {
  const zoneArea = Math.PI * LOCAL_ZONE_RADIUS_M ** 2;
  return Math.min(100, (revealedAreaM2(cellCount) / zoneArea) * 100);
}

export function worldPercent(cellCount: number): number {
  return (revealedAreaM2(cellCount) / WORLD_LAND_AREA_M2) * 100;
}

/** Formate un petit pourcentage du monde de façon lisible plutôt que d'afficher
 * une longue suite de zéros ("0,0000042 %" -> "4,2 × 10⁻⁶ %"). */
export function formatWorldPercent(pct: number): string {
  if (pct === 0) return "0 %";
  if (pct >= 0.001) return `${pct.toLocaleString("fr-FR", { maximumFractionDigits: 3 })} %`;
  const exp = Math.floor(Math.log10(pct));
  const mantissa = pct / Math.pow(10, exp);
  const sup = String(exp).replace("-", "⁻").replace(/\d/g, (d) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[Number(d)]);
  return `${mantissa.toFixed(1)} × 10${sup} %`;
}

export function formatArea(m2: number): string {
  if (m2 < 10000) return `${Math.round(m2).toLocaleString("fr-FR")} m²`;
  return `${(m2 / 1_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 3 })} km²`;
}
