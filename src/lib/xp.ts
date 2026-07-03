/** Courbe de progression : XP nécessaire croît de façon quadratique douce. */
export function xpForLevel(level: number): number {
  return Math.round(50 * Math.pow(level, 1.55));
}

export function levelFromXp(xp: number): number {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level++;
  return level;
}

export function xpProgress(xp: number): {
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progressRatio: number;
} {
  const level = levelFromXp(xp);
  const currentLevelXp = xpForLevel(level);
  const nextLevelXp = xpForLevel(level + 1);
  const progressRatio =
    (xp - currentLevelXp) / Math.max(1, nextLevelXp - currentLevelXp);
  return { level, currentLevelXp, nextLevelXp, progressRatio: Math.min(1, Math.max(0, progressRatio)) };
}

export const XP_PER_CELL_REVEALED = 1;
export const XP_PER_CHEST: Record<"commun" | "rare" | "légendaire", number> = {
  commun: 15,
  rare: 45,
  légendaire: 150,
};
export const XP_PER_ACHIEVEMENT = 60;
