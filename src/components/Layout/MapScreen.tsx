import { useCallback, useEffect, useState } from "react";
import { Compass, Satellite, ShieldAlert } from "lucide-react";
import { MapView } from "@/components/Map/MapView";
import { RadarHUD } from "@/components/UI/RadarHUD";
import { ChestApproachSheet, RewardModal } from "@/components/UI/ChestModal";
import { useGameStore } from "@/store/useGameStore";
import { useGeolocation, requestGeoPermissionOnce } from "@/hooks/useGeolocation";
import { useWakeLock } from "@/hooks/useWakeLock";

export function MapScreen() {
  const trackingEnabled = useGameStore((s) => s.trackingEnabled);
  const setTrackingEnabled = useGameStore((s) => s.setTrackingEnabled);
  const setHeading = useGameStore((s) => s.setHeading);
  const recordPosition = useGameStore((s) => s.recordPosition);
  const stats = useGameStore((s) => s.stats);
  const chests = useGameStore((s) => s.chests);
  const chestsLoading = useGameStore((s) => s.chestsLoading);
  const roadDataAvailable = useGameStore((s) => s.roadDataAvailable);
  const lastReward = useGameStore((s) => s.lastReward);
  const clearLastReward = useGameStore((s) => s.clearLastReward);

  const [followPlayer, setFollowPlayer] = useState(true);
  const [selectedChestId, setSelectedChestId] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const geo = useGeolocation({
    enabled: trackingEnabled,
    onPosition: (pos, ts, accuracy, speedKmh) => {
      void recordPosition(pos, ts, accuracy, speedKmh);
    },
  });

  useEffect(() => {
    if (geo.heading !== null) setHeading(geo.heading);
  }, [geo.heading, setHeading]);

  const wakeLock = useWakeLock();

  const handleStartExploring = useCallback(async () => {
    try {
      await requestGeoPermissionOnce();
      setPermissionError(null);
      setTrackingEnabled(true);
    } catch (e) {
      setPermissionError(
        "Accès à la position refusé. Autorisez la géolocalisation dans les réglages de votre navigateur pour explorer."
      );
    }
  }, [setTrackingEnabled]);

  const selectedChest = chests.find((c) => c.id === selectedChestId) ?? null;

  return (
    <div className="absolute inset-0 overflow-hidden">
      <MapView
        liveHeading={geo.heading}
        liveAccuracy={geo.accuracy}
        followPlayer={followPlayer}
        onChestClick={(id) => setSelectedChestId(id)}
        onMapDragged={() => setFollowPlayer(false)}
      />

      <div className="pointer-events-none absolute inset-0 bg-scanlines opacity-40" />

      <div className="pointer-events-auto">
        <RadarHUD
          xp={stats.xp}
          totalDistanceMeters={stats.totalDistanceMeters}
          isTracking={geo.isTracking}
          gpsAccuracy={geo.accuracy}
          onToggleTracking={() => setTrackingEnabled(!trackingEnabled)}
          onRecenter={() => setFollowPlayer(true)}
          wakeLockActive={wakeLock.active}
          wakeLockEnabled={wakeLock.enabled}
          onToggleWakeLock={wakeLock.toggle}
        />
      </div>

      {!trackingEnabled && (
        <div className="absolute inset-0 z-[1300] flex items-center justify-center bg-void-950/85 backdrop-blur-md p-6">
          <div className="hud-panel max-w-sm w-full p-6 text-center">
            <div className="mx-auto w-14 h-14 rounded-full border border-signal-500/40 flex items-center justify-center mb-4">
              <Compass size={26} className="text-signal-400 animate-radar-sweep" />
            </div>
            <h2 className="text-xl font-display font-bold">Le brouillard vous attend</h2>
            <p className="text-sm text-slate-400 mt-2">
              Activez le GPS pour commencer à dissiper le brouillard de guerre autour de vous et débusquer
              des reliques cachées dans le monde réel.
            </p>
            {permissionError && (
              <p className="mt-3 text-xs text-danger-500 flex items-center gap-1.5 justify-center">
                <ShieldAlert size={14} /> {permissionError}
              </p>
            )}
            <button
              onClick={handleStartExploring}
              className="mt-5 w-full py-3 rounded-md bg-signal-500 text-void-950 font-display font-semibold flex items-center justify-center gap-2 hover:bg-signal-400 active:scale-[0.98] transition-all"
            >
              <Satellite size={18} />
              Activer le GPS et explorer
            </button>
            <p className="mt-3 text-[10px] text-slate-600 font-mono">
              100% local — aucune donnée de position n'est jamais envoyée à un serveur.
            </p>
          </div>
        </div>
      )}

      {selectedChest && (
        <ChestApproachSheet chest={selectedChest} onClose={() => setSelectedChestId(null)} />
      )}

      {lastReward && (
        <RewardModal
          artifactId={lastReward.artifactId}
          chestKind={lastReward.kind}
          onClose={clearLastReward}
        />
      )}

      {roadDataAvailable === false && !chestsLoading && (
        <div className="absolute bottom-[104px] inset-x-0 z-[1100] flex justify-center px-4 pointer-events-none">
          <div className="hud-panel px-3 py-2 text-[11px] font-mono text-slate-400 text-center max-w-xs">
            Aucun chemin public connu ici pour l'instant — connectez-vous à internet une fois pour
            découvrir les coffres de cette zone (mis en cache ensuite, hors-ligne).
          </div>
        </div>
      )}
    </div>
  );
}
