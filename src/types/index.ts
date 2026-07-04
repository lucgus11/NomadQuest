/** Coordonnées géographiques simples [longitude, latitude] pour rester
 * compatible avec les conventions GeoJSON utilisées ailleurs dans l'app. */
export interface LatLng {
  lat: number;
  lng: number;
}

/** Une cellule de la grille de brouillard de guerre, identifiée par sa clé
 * "gx:gy" et révélée à un instant donné. */
export interface FogCell {
  key: string; // `${gx}:${gy}`
  gx: number;
  gy: number;
  revealedAt: number; // timestamp
}

export type ArtifactRarity = "commun" | "rare" | "épique" | "légendaire";

export interface ArtifactDefinition {
  id: string;
  name: string;
  description: string;
  rarity: ArtifactRarity;
  icon: string; // nom d'icône lucide-react
  loreFragment: string;
}

export interface InventoryItem {
  uid: string; // instance unique (uuid)
  artifactId: string;
  collectedAt: number;
  collectedAt_position: LatLng;
}

export type ChestKind = "commun" | "rare" | "légendaire";

/** Un coffre tel qu'affiché à l'écran : généré à la volée de façon
 * déterministe (voir lib/chestField.ts) — non persisté tant qu'il n'est pas
 * ouvert. Son `id` est stable (dérivé de sa cellule de grille), donc il
 * réapparaît identique si on quitte puis revient dans la zone. */
export interface ChestNode {
  id: string;
  position: LatLng;
  kind: ChestKind;
  openedAt: number | null;
  rewardArtifactId: string | null;
}

/** Seul ce qui est *ouvert* est persisté en base — le reste est régénéré
 * procéduralement à chaque affichage, ce qui permet d'avoir des coffres
 * "partout dans le monde" sans stocker des millions d'entrées. */
export interface OpenedChestRecord {
  id: string;
  kind: ChestKind;
  rewardArtifactId: string;
  openedAt: number;
  position: LatLng;
}

/** Segment de route/chemin public (OpenStreetMap), utilisé pour n'ancrer les
 * coffres que sur la voirie publique (routes, sentiers, chemins forestiers)
 * et jamais en pleine propriété privée. */
export interface RoadSegment {
  aLat: number;
  aLng: number;
  bLat: number;
  bLng: number;
}

export interface RoadTileCache {
  key: string;
  fetchedAt: number;
  segments: RoadSegment[];
}


export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  check: (ctx: AchievementContext) => boolean;
}

export interface AchievementContext {
  totalDistanceMeters: number;
  totalCellsRevealed: number;
  chestsOpened: number;
  legendaryChestsOpened: number;
  nightWalkMeters: number;
  currentStreakDays: number;
  distinctArtifacts: number;
  maxSpeedKmh: number;
}

export interface UnlockedAchievement {
  id: string;
  unlockedAt: number;
}

export interface PlayerStats {
  totalDistanceMeters: number;
  nightWalkMeters: number;
  lastPosition: LatLng | null;
  lastTimestamp: number | null;
  xp: number;
  level: number;
  currentStreakDays: number;
  lastActiveDay: string | null; // "YYYY-MM-DD"
  maxSpeedKmh: number;
}

export interface GeoTrackPoint extends LatLng {
  t: number;
  accuracy: number | null;
}
