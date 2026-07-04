import type { LatLng, RoadSegment, RoadTileCache } from "@/types";
import { METERS_PER_DEGREE_LAT, metersPerDegreeLng } from "@/lib/geoUtils";
import * as db from "@/lib/db";

/** Taille (en degrés) d'une tuile de cache du réseau routier — environ 2,2 km
 * de côté. Suffisamment grand pour couvrir un quartier en une seule requête,
 * assez petit pour rester léger et rapide à interroger. */
const TILE_SIZE_DEG = 0.02;
const CACHE_MAX_AGE_MS = 45 * 24 * 60 * 60 * 1000; // 45 jours
const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";

/** Types de voies considérées comme "publiques" : routes, rues, chemins,
 * sentiers, pistes forestières. Volontairement exclus : autoroutes (non
 * praticables à pied), allées privées non taguées publiques. */
const HIGHWAY_TYPES =
  "footway|path|track|residential|service|unclassified|tertiary|secondary|primary|living_street|pedestrian|cycleway|bridleway|steps";

function tileBoundsForKey(key: string) {
  const [tx, ty] = key.split(":").map(Number);
  return {
    south: tx * TILE_SIZE_DEG,
    north: (tx + 1) * TILE_SIZE_DEG,
    west: ty * TILE_SIZE_DEG,
    east: (ty + 1) * TILE_SIZE_DEG,
  };
}

function tileKeysForBounds(bounds: {
  north: number;
  south: number;
  east: number;
  west: number;
}): string[] {
  const keys = new Set<string>();
  const txMin = Math.floor(bounds.south / TILE_SIZE_DEG);
  const txMax = Math.floor(bounds.north / TILE_SIZE_DEG);
  const tyMin = Math.floor(bounds.west / TILE_SIZE_DEG);
  const tyMax = Math.floor(bounds.east / TILE_SIZE_DEG);
  for (let tx = txMin; tx <= txMax; tx++) {
    for (let ty = tyMin; ty <= tyMax; ty++) {
      keys.add(`${tx}:${ty}`);
    }
  }
  return [...keys];
}

async function fetchRoadsForTile(key: string): Promise<RoadTileCache> {
  const b = tileBoundsForKey(key);
  const query = `[out:json][timeout:25];(way["highway"~"^(${HIGHWAY_TYPES})$"](${b.south},${b.west},${b.north},${b.east}););out geom;`;

  const res = await fetch(OVERPASS_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!res.ok) throw new Error(`Overpass a répondu ${res.status}`);
  const data = await res.json();

  const segments: RoadSegment[] = [];
  for (const el of data.elements ?? []) {
    if (el.type === "way" && Array.isArray(el.geometry)) {
      for (let i = 0; i < el.geometry.length - 1; i++) {
        const a = el.geometry[i];
        const b2 = el.geometry[i + 1];
        if (a && b2) {
          segments.push({ aLat: a.lat, aLng: a.lon, bLat: b2.lat, bLng: b2.lon });
        }
      }
    }
  }
  return { key, fetchedAt: Date.now(), segments };
}

/** Nombre max de tuiles interrogées en une fois — au-delà (carte très
 * dézoomée), on renonce plutôt que de spammer l'API publique Overpass. */
const MAX_TILES_PER_REQUEST = 6;

/** Charge (ou récupère du cache local) le réseau routier public couvrant les
 * bounds données. Retourne `null` si aucune donnée n'est disponible (ni en
 * cache, ni via le réseau) : dans ce cas, aucun coffre ne doit être généré
 * dans la zone plutôt que de risquer de le placer en terrain privé. */
export async function ensureRoadDataForBounds(bounds: {
  north: number;
  south: number;
  east: number;
  west: number;
}): Promise<RoadSegment[] | null> {
  const keys = tileKeysForBounds(bounds);
  if (keys.length > MAX_TILES_PER_REQUEST) return null;

  const allSegments: RoadSegment[] = [];
  for (const key of keys) {
    let cached = await db.getRoadTile(key);
    const isStale = !cached || Date.now() - cached.fetchedAt > CACHE_MAX_AGE_MS;

    if (isStale) {
      try {
        const fresh = await fetchRoadsForTile(key);
        await db.saveRoadTile(fresh);
        cached = fresh;
      } catch {
        // Hors-ligne ou API indisponible : on retombe sur le cache existant
        // s'il y en a un (même périmé), sinon cette tuile reste vide.
      }
    }
    if (cached) allSegments.push(...cached.segments);
  }

  return allSegments.length > 0 ? allSegments : null;
}

/* --------------------- Géométrie : projection plane locale --------------------- */

function toLocalMeters(origin: LatLng, point: LatLng) {
  const mPerLng = metersPerDegreeLng(origin.lat);
  return {
    x: (point.lng - origin.lng) * mPerLng,
    y: (point.lat - origin.lat) * METERS_PER_DEGREE_LAT,
  };
}

function fromLocalMeters(origin: LatLng, x: number, y: number): LatLng {
  const mPerLng = metersPerDegreeLng(origin.lat);
  return {
    lat: origin.lat + y / METERS_PER_DEGREE_LAT,
    lng: origin.lng + x / mPerLng,
  };
}

/** Point le plus proche du réseau routier, dans un rayon maximal donné (m).
 * Retourne `null` si aucune route n'est assez proche. */
export function nearestPointOnRoads(
  point: LatLng,
  segments: RoadSegment[],
  maxDistanceMeters: number
): { point: LatLng; distanceMeters: number } | null {
  let best: { x: number; y: number; distanceMeters: number } | null = null;

  for (const seg of segments) {
    const a = toLocalMeters(point, { lat: seg.aLat, lng: seg.aLng });
    const b = toLocalMeters(point, { lat: seg.bLat, lng: seg.bLng });

    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSq = dx * dx + dy * dy;

    let t = lengthSq > 0 ? (-a.x * dx - a.y * dy) / lengthSq : 0;
    t = Math.max(0, Math.min(1, t));

    const px = a.x + t * dx;
    const py = a.y + t * dy;
    const distanceMeters = Math.hypot(px, py); // le point de référence est l'origine locale (0,0)

    if (distanceMeters <= maxDistanceMeters && (!best || distanceMeters < best.distanceMeters)) {
      best = { x: px, y: py, distanceMeters };
    }
  }

  if (!best) return null;
  return { point: fromLocalMeters(point, best.x, best.y), distanceMeters: best.distanceMeters };
}
