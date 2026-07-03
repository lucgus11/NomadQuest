import { useEffect } from "react";
import { icons, Sparkles } from "lucide-react";
import { useGameStore } from "@/store/useGameStore";

function DynamicIcon({ name, ...props }: { name: string; size?: number; className?: string }) {
  const Icon = (icons as Record<string, React.ComponentType<{ size?: number; className?: string }>>)[name];
  if (!Icon) return <Sparkles {...props} />;
  return <Icon {...props} />;
}

export function AchievementToastStack() {
  const pending = useGameStore((s) => s.pendingAchievements);
  const dismiss = useGameStore((s) => s.dismissAchievement);

  useEffect(() => {
    if (pending.length === 0) return;
    const t = setTimeout(() => dismiss(pending[0].id), 4200);
    return () => clearTimeout(t);
  }, [pending, dismiss]);

  if (pending.length === 0) return null;
  const current = pending[0];

  return (
    <div className="fixed top-[calc(env(safe-area-inset-top)+92px)] inset-x-0 z-[1600] flex justify-center px-4 pointer-events-none">
      <div className="hud-panel px-4 py-3 flex items-center gap-3 max-w-sm w-full shadow-glow-relic pointer-events-auto animate-float-y">
        <div className="w-10 h-10 rounded-full border border-relic-500/50 bg-relic-500/10 text-relic-400 flex items-center justify-center shrink-0">
          <DynamicIcon name={current.icon} size={18} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-mono uppercase tracking-widest text-relic-400">Succès débloqué</p>
          <p className="text-sm font-semibold truncate">{current.name}</p>
        </div>
      </div>
    </div>
  );
}
