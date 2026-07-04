import { AlertTriangle, BatteryCharging, Compass, Crosshair, Radar, Satellite, SatelliteDish } from "lucide-react";
import { xpProgress } from "@/lib/xp";
import { formatDistance } from "@/lib/geoUtils";

/** Au-delà de cette précision (m), le signal est jugé trop imprécis pour
 * exploiter le brouillard / la distance de façon fiable — on prévient
 * l'utilisateur plutôt que de le laisser croire que l'app est cassée. */
const POOR_ACCURACY_THRESHOLD_M = 100;

interface RadarHUDProps {
  xp: number;
  totalDistanceMeters: number;
  isTracking: boolean;
  gpsAccuracy: number | null;
  onToggleTracking: () => void;
  onRecenter: () => void;
  wakeLockActive: boolean;
  wakeLockEnabled: boolean;
  onToggleWakeLock: () => void;
}

export function RadarHUD({
  xp,
  totalDistanceMeters,
  isTracking,
  gpsAccuracy,
  onToggleTracking,
  onRecenter,
  wakeLockActive,
  wakeLockEnabled,
  onToggleWakeLock,
}: RadarHUDProps) {
  const { level, progressRatio } = xpProgress(xp);
  const poorAccuracy = gpsAccuracy !== null && gpsAccuracy > POOR_ACCURACY_THRESHOLD_M;

  return (
    <div className="fixed top-0 inset-x-0 z-[1100] pt-[env(safe-area-inset-top)]">
      <div className="mx-3 mt-3 hud-panel px-3 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative shrink-0 w-9 h-9 rounded-full border border-signal-500/40 flex items-center justify-center bg-void-700">
              <Radar size={16} className="text-signal-400 animate-radar-sweep" />
              <span className="absolute -bottom-1 -right-1 text-[9px] font-mono bg-signal-500 text-void-950 rounded-full w-4 h-4 flex items-center justify-center font-bold">
                {level}
              </span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                <span>Niv. {level}</span>
                <span className="text-slate-600">•</span>
                <span className="flex items-center gap-1">
                  <Compass size={11} /> {formatDistance(totalDistanceMeters)}
                </span>
              </div>
              <div className="mt-1 w-32 sm:w-40 h-1.5 bg-void-600 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-signal-600 to-signal-glow rounded-full transition-all duration-500"
                  style={{ width: `${progressRatio * 100}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={onToggleWakeLock}
              title={wakeLockEnabled ? "Désactiver le maintien de l'écran" : "Maintenir l'écran allumé"}
              className={`w-9 h-9 rounded-md border flex items-center justify-center transition-colors ${
                wakeLockActive
                  ? "border-signal-500/50 text-signal-400 bg-signal-500/10"
                  : "border-void-600 text-slate-500"
              }`}
            >
              <BatteryCharging size={16} />
            </button>
            <button
              onClick={onRecenter}
              title="Recentrer sur ma position"
              className="w-9 h-9 rounded-md border border-void-600 text-slate-300 flex items-center justify-center"
            >
              <Crosshair size={16} />
            </button>
            <button
              onClick={onToggleTracking}
              title={isTracking ? "Mettre en pause le suivi GPS" : "Démarrer le suivi GPS"}
              className={`w-9 h-9 rounded-md border flex items-center justify-center transition-colors ${
                isTracking
                  ? "border-signal-500/60 text-signal-400 bg-signal-500/10 shadow-glow-signal"
                  : "border-danger-500/50 text-danger-500"
              }`}
            >
              {isTracking ? <SatelliteDish size={16} /> : <Satellite size={16} />}
            </button>
          </div>
        </div>

        {isTracking && <div className="mt-2 hud-divider" />}
        {isTracking && (
          <div className="mt-1.5 flex items-center justify-between text-[10px] font-mono text-slate-500">
            <span className={poorAccuracy ? "text-danger-500" : ""}>
              SIGNAL GPS {gpsAccuracy ? `±${Math.round(gpsAccuracy)}m` : "…"}
            </span>
            <span className="text-signal-500/80 animate-pulse">● SUIVI ACTIF</span>
          </div>
        )}
        {isTracking && poorAccuracy && (
          <div className="mt-1.5 flex items-start gap-1.5 text-[10px] font-mono text-danger-500 bg-danger-500/10 border border-danger-500/30 rounded-md px-2 py-1.5">
            <AlertTriangle size={13} className="shrink-0 mt-px" />
            <span>
              Signal imprécis (±{Math.round(gpsAccuracy!)}m). Le brouillard ne se dissipera pas de façon
              fiable — sortez à l'extérieur, loin des bâtiments, ou testez sur mobile avec le GPS activé.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
