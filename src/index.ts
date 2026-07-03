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

export interface ChestNode {
  id: string;
  position: LatLng;
  kind: ChestKind;
  createdAt: number;
  openedAt: number | null;
  rewardArtifactId: string | null;
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
