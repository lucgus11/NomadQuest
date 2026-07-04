import { Flame, Gauge, Globe2, Map, Moon, TrendingUp, Trophy } from "lucide-react";
import { useGameStore } from "@/store/useGameStore";
import { formatDistance } from "@/lib/geoUtils";
import {
  formatArea,
  formatWorldPercent,
  localZonePercent,
  revealedAreaM2,
  worldPercent,
} from "@/lib/statsCalc";
import { xpProgress } from "@/lib/xp";
import { ACHIEVEMENTS } from "@/data/achievementsList";

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent = "signal",
}: {
  icon: typeof Map;
  label: string;
  value: string;
  sub?: string;
  accent?: "signal" | "relic";
}) {
  const colorClass = accent === "relic" ? "text-relic-400" : "text-signal-400";
  return (
    <div className="hud-panel p-4">
      <div className={`flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest ${colorClass}`}>
        <Icon size={14} />
        {label}
      </div>
      <p className="mt-2 text-2xl font-display font-bold">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500 font-mono">{sub}</p>}
    </div>
  );
}

export function StatsPanel() {
  const stats = useGameStore((s) => s.stats);
  const fogCellKeys = useGameStore((s) => s.fogCellKeys);
  const unlockedIds = useGameStore((s) => s.unlockedAchievementIds);
  const inventory = useGameStore((s) => s.inventory);
  const openedChestIds = useGameStore((s) => s.openedChestIds);

  const cellCount = fogCellKeys.size;
  const zonePct = localZonePercent(cellCount);
  const worldPct = worldPercent(cellCount);
  const { level, progressRatio, nextLevelXp, currentLevelXp } = xpProgress(stats.xp);
  const openedChests = openedChestIds.size;

  return (
    <div className="h-full overflow-y-auto hud-scroll px-4 pt-[calc(env(safe-area-inset-top)+16px)] pb-28">
      <header className="mb-5">
        <p className="text-[11px] font-mono uppercase tracking-[0.3em] text-signal-500/80">
          Journal d'exploration
        </p>
        <h1 className="text-2xl font-display font-bold mt-1">Tableau de bord</h1>
      </header>

      <div className="hud-panel p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-mono text-slate-400 uppercase tracking-wider">Rang d'exploration</p>
            <p className="text-3xl font-display font-bold text-signal-400 text-glow mt-1">Niveau {level}</p>
          </div>
          <div className="w-16 h-16 rounded-full border-2 border-signal-500/40 flex items-center justify-center relative">
            <Trophy size={26} className="text-relic-400" />
          </div>
        </div>
        <div className="mt-3 w-full h-2.5 bg-void-600 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-signal-600 to-signal-glow rounded-full transition-all duration-700"
            style={{ width: `${progressRatio * 100}%` }}
          />
        </div>
        <p className="mt-1.5 text-[11px] font-mono text-slate-500">
          {stats.xp - currentLevelXp} / {nextLevelXp - currentLevelXp} XP vers le niveau {level + 1}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={TrendingUp} label="Distance totale" value={formatDistance(stats.totalDistanceMeters)} />
        <StatCard icon={Moon} label="Marche nocturne" value={formatDistance(stats.nightWalkMeters)} />
        <StatCard
          icon={Map}
          label="Zone locale"
          value={`${zonePct.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`}
          sub={formatArea(revealedAreaM2(cellCount))}
        />
        <StatCard icon={Globe2} label="Monde découvert" value={formatWorldPercent(worldPct)} accent="relic" />
        <StatCard icon={Flame} label="Série active" value={`${stats.currentStreakDays} j`} />
        <StatCard icon={Gauge} label="Vitesse record" value={`${stats.maxSpeedKmh.toFixed(1)} km/h`} />
      </div>

      <div className="mt-4 hud-panel p-4">
        <p className="text-[11px] font-mono uppercase tracking-widest text-signal-500/80 mb-3">Progression</p>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-xl font-display font-bold">{openedChests}</p>
            <p className="text-[10px] text-slate-500 font-mono uppercase mt-0.5">Coffres ouverts</p>
          </div>
          <div>
            <p className="text-xl font-display font-bold">{new Set(inventory.map((i) => i.artifactId)).size}</p>
            <p className="text-[10px] text-slate-500 font-mono uppercase mt-0.5">Artefacts uniques</p>
          </div>
          <div>
            <p className="text-xl font-display font-bold">
              {unlockedIds.size}/{ACHIEVEMENTS.length}
            </p>
            <p className="text-[10px] text-slate-500 font-mono uppercase mt-0.5">Succès</p>
          </div>
        </div>
      </div>
    </div>
  );
}
