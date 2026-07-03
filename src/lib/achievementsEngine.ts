import { ACHIEVEMENTS } from "@/data/achievementsList";
import type { AchievementContext, AchievementDefinition } from "@/types";

export function evaluateNewAchievements(
  ctx: AchievementContext,
  alreadyUnlockedIds: Set<string>
): AchievementDefinition[] {
  return ACHIEVEMENTS.filter(
    (a) => !alreadyUnlockedIds.has(a.id) && a.check(ctx)
  );
}

export function isNightHour(date: Date): boolean {
  const h = date.getHours();
  return h >= 22 || h < 5;
}

export function todayKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function yesterdayKey(date: Date = new Date()): string {
  const d = new Date(date);
  d.setDate(d.getDate() - 1);
  return todayKey(d);
}
