import { useEffect, useState } from "react";
import { Radar } from "lucide-react";
import { MapScreen } from "@/components/Layout/MapScreen";
import { StatsPanel } from "@/components/UI/StatsPanel";
import { AchievementsPanel } from "@/components/UI/AchievementsPanel";
import { InventoryPanel } from "@/components/UI/InventoryPanel";
import { SettingsPanel } from "@/components/UI/SettingsPanel";
import { BottomNav, type TabId } from "@/components/UI/BottomNav";
import { AchievementToastStack } from "@/components/UI/AchievementToast";
import { useGameStore } from "@/store/useGameStore";

export default function App() {
  const [tab, setTab] = useState<TabId>("map");
  const ready = useGameStore((s) => s.ready);
  const init = useGameStore((s) => s.init);

  useEffect(() => {
    void init();
  }, [init]);

  if (!ready) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-void-950">
        <Radar size={40} className="text-signal-400 animate-radar-sweep" />
        <p className="mt-4 font-mono text-xs uppercase tracking-[0.3em] text-slate-500">
          Chargement des données locales…
        </p>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative bg-void-950">
      <div className="absolute inset-0" style={{ visibility: tab === "map" ? "visible" : "hidden" }}>
        <MapScreen />
      </div>
      {tab === "stats" && <StatsPanel />}
      {tab === "achievements" && <AchievementsPanel />}
      {tab === "inventory" && <InventoryPanel />}
      {tab === "settings" && <SettingsPanel />}

      <AchievementToastStack />
      <BottomNav active={tab} onChange={setTab} />
    </div>
  );
}
