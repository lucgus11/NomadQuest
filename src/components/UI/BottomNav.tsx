import { Map, Radar, Trophy, Backpack, Settings } from "lucide-react";

export type TabId = "map" | "stats" | "achievements" | "inventory" | "settings";

const TABS: { id: TabId; label: string; icon: typeof Map }[] = [
  { id: "map", label: "Carte", icon: Map },
  { id: "stats", label: "Stats", icon: Radar },
  { id: "achievements", label: "Succès", icon: Trophy },
  { id: "inventory", label: "Sac", icon: Backpack },
  { id: "settings", label: "Réglages", icon: Settings },
];

export function BottomNav({
  active,
  onChange,
}: {
  active: TabId;
  onChange: (tab: TabId) => void;
}) {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-[1200] pb-[env(safe-area-inset-bottom)]">
      <div className="mx-3 mb-3 hud-panel flex items-stretch justify-between px-1 py-1">
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className={`relative flex-1 flex flex-col items-center gap-1 py-2.5 rounded-md transition-colors ${
                isActive ? "text-signal-400" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {isActive && (
                <span className="absolute inset-x-3 -top-0.5 h-0.5 rounded-full bg-signal-400 shadow-glow-signal" />
              )}
              <Icon size={20} strokeWidth={isActive ? 2.4 : 1.8} className={isActive ? "text-glow" : ""} />
              <span className="text-[10px] font-mono tracking-wide uppercase">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
