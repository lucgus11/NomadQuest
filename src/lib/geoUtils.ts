import type { LatLng } from "@/types";

const EARTH_RADIUS_M = 6371000;

/** Distance en mètres entre deux points GPS (formule de Haversine). */
export function haversineDistance(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return EARTH_RADIUS_M * c;
}

/** Déplace un point d'une distance (m) et d'un cap (degrés, 0 = Nord). */
export function destinationPoint(
  origin: LatLng,
  distanceMeters: number,
  bearingDeg: number
): LatLng {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const δ = distanceMeters / EARTH_RADIUS_M;
  const θ = toRad(bearingDeg);
  const φ1 = toRad(origin.lat);
  const λ1 = toRad(origin.lng);

  const φ2 = Math.asin(
    Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ)
  );
  const λ2 =
    λ1 +
    Math.atan2(
      Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
      Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2)
    );

  return { lat: toDeg(φ2), lng: ((toDeg(λ2) + 540) % 360) - 180 };
}

/** Mètres approximatifs par degré de longitude à une latitude donnée. */
export function metersPerDegreeLng(lat: number): number {
  return 111320 * Math.cos((lat * Math.PI) / 180);
}

export const METERS_PER_DEGREE_LAT = 110540;

/** Convertit une distance en km lisible ("1,24 km" / "340 m"). */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toLocaleString("fr-FR", {
    maximumFractionDigits: 2,
  })} km`;
}
