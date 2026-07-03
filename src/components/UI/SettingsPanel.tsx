import { useState } from "react";
import { AlertTriangle, Database, Download, ShieldCheck, Trash2 } from "lucide-react";
import { useGameStore } from "@/store/useGameStore";
import { exportAllData } from "@/lib/db";

export function SettingsPanel() {
  const fogRadius = useGameStore((s) => s.fogRadiusMeters);
  const setFogRadius = useGameStore((s) => s.setFogRadius);
  const resetAllData = useGameStore((s) => s.resetAllData);
  const [confirmReset, setConfirmReset] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nomadquest-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const handleReset = async () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    await resetAllData();
    setConfirmReset(false);
  };

  return (
    <div className="h-full overflow-y-auto hud-scroll px-4 pt-[calc(env(safe-area-inset-top)+16px)] pb-28">
      <header className="mb-5">
        <p className="text-[11px] font-mono uppercase tracking-[0.3em] text-signal-500/80">Console</p>
        <h1 className="text-2xl font-display font-bold mt-1">Réglages</h1>
      </header>

      <section className="hud-panel p-4 mb-4">
        <p className="text-sm font-semibold">Rayon de dissipation du brouillard</p>
        <p className="text-xs text-slate-500 mt-1">
          Distance autour de vous à laquelle le brouillard de guerre se dissipe pendant que vous marchez.
        </p>
        <div className="mt-4 flex items-center gap-3">
          <input
            type="range"
            min={10}
            max={80}
            step={5}
            value={fogRadius}
            onChange={(e) => setFogRadius(Number(e.target.value))}
            className="flex-1 accent-signal-500"
          />
          <span className="font-mono text-signal-400 w-14 text-right">{fogRadius} m</span>
        </div>
      </section>

      <section className="hud-panel p-4 mb-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck size={16} className="text-signal-400" />
          100% local, sans compte
        </div>
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
          NomadQuest ne possède aucun serveur : votre progression, votre carte explorée et vos objets sont
          stockés uniquement sur cet appareil via IndexedDB. Rien n'est envoyé ni partagé. Désinstaller
          l'application ou vider les données du site effacera définitivement votre progression — pensez à
          exporter une sauvegarde régulièrement.
        </p>
      </section>

      <section className="hud-panel p-4 mb-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Database size={16} className="text-signal-400" />
          Sauvegarde
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="mt-3 w-full py-2.5 rounded-md border border-signal-500/40 text-signal-400 flex items-center justify-center gap-2 font-mono text-sm hover:bg-signal-500/10 transition-colors"
        >
          <Download size={15} />
          {exporting ? "Export en cours..." : "Exporter mes données (.json)"}
        </button>
      </section>

      <section className="hud-panel p-4 border-danger-500/30">
        <div className="flex items-center gap-2 text-sm font-semibold text-danger-500">
          <AlertTriangle size={16} />
          Zone de danger
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Réinitialise toute la progression : brouillard, coffres, inventaire, succès et statistiques.
          Cette action est irréversible.
        </p>
        <button
          onClick={handleReset}
          onBlur={() => setConfirmReset(false)}
          className={`mt-3 w-full py-2.5 rounded-md flex items-center justify-center gap-2 font-mono text-sm transition-colors ${
            confirmReset
              ? "bg-danger-500 text-void-950 font-semibold"
              : "border border-danger-500/40 text-danger-500 hover:bg-danger-500/10"
          }`}
        >
          <Trash2 size={15} />
          {confirmReset ? "Confirmer la réinitialisation" : "Réinitialiser toutes les données"}
        </button>
      </section>
    </div>
  );
}
