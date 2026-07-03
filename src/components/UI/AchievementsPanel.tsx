import { icons, Lock, Sparkles } from "lucide-react";
import { ACHIEVEMENTS } from "@/data/achievementsList";
import { useGameStore } from "@/store/useGameStore";

function DynamicIcon({ name, ...props }: { name: string; size?: number; className?: string }) {
  const Icon = (icons as Record<string, React.ComponentType<{ size?: number; className?: string }>>)[name];
  if (!Icon) return <Sparkles {...props} />;
  return <Icon {...props} />;
}

export function AchievementsPanel() {
  const unlockedMap = useGameStore((s) => s.unlockedAchievementIds);

  const unlockedCount = ACHIEVEMENTS.filter((a) => unlockedMap.has(a.id)).length;

  return (
    <div className="h-full overflow-y-auto hud-scroll px-4 pt-[calc(env(safe-area-inset-top)+16px)] pb-28">
      <header className="mb-5">
        <p className="text-[11px] font-mono uppercase tracking-[0.3em] text-signal-500/80">
          Archives du nomade
        </p>
        <h1 className="text-2xl font-display font-bold mt-1">Succès</h1>
        <p className="text-sm text-slate-500 mt-1 font-mono">
          {unlockedCount} / {ACHIEVEMENTS.length} débloqués
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ACHIEVEMENTS.map((a) => {
          const isUnlocked = unlockedMap.has(a.id);
          return (
            <div
              key={a.id}
              className={`hud-panel p-4 flex items-center gap-3 transition-opacity ${
                isUnlocked ? "" : "opacity-50"
              }`}
            >
              <div
                className={`shrink-0 w-11 h-11 rounded-full flex items-center justify-center border ${
                  isUnlocked
                    ? "border-relic-500/50 bg-relic-500/10 text-relic-400 shadow-glow-relic"
                    : "border-void-600 text-slate-600"
                }`}
              >
                {isUnlocked ? <DynamicIcon name={a.icon} size={20} /> : <Lock size={18} />}
              </div>
              <div className="min-w-0">
                <p className={`font-display font-semibold ${isUnlocked ? "text-slate-100" : "text-slate-400"}`}>
                  {a.name}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">{a.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
