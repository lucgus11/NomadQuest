import { useState } from "react";
import { icons, Sparkles, X } from "lucide-react";
import { useGameStore } from "@/store/useGameStore";
import { ARTIFACTS, getArtifactById, RARITY_COLORS } from "@/data/artifacts";
import type { InventoryItem } from "@/types";

function DynamicIcon({ name, ...props }: { name: string; size?: number; className?: string }) {
  const Icon = (icons as Record<string, React.ComponentType<{ size?: number; className?: string }>>)[name];
  if (!Icon) return <Sparkles {...props} />;
  return <Icon {...props} />;
}

export function InventoryPanel() {
  const inventory = useGameStore((s) => s.inventory);
  const [selected, setSelected] = useState<InventoryItem | null>(null);

  const ownedIds = new Set(inventory.map((i) => i.artifactId));
  const countByArtifact = new Map<string, number>();
  for (const item of inventory) {
    countByArtifact.set(item.artifactId, (countByArtifact.get(item.artifactId) ?? 0) + 1);
  }

  return (
    <div className="h-full overflow-y-auto hud-scroll px-4 pt-[calc(env(safe-area-inset-top)+16px)] pb-28">
      <header className="mb-5">
        <p className="text-[11px] font-mono uppercase tracking-[0.3em] text-signal-500/80">
          Reliques recueillies
        </p>
        <h1 className="text-2xl font-display font-bold mt-1">Sac d'exploration</h1>
        <p className="text-sm text-slate-500 mt-1 font-mono">
          {ownedIds.size} / {ARTIFACTS.length} artefacts découverts
        </p>
      </header>

      <div className="grid grid-cols-3 gap-3">
        {ARTIFACTS.map((artifact) => {
          const owned = ownedIds.has(artifact.id);
          const count = countByArtifact.get(artifact.id) ?? 0;
          return (
            <button
              key={artifact.id}
              disabled={!owned}
              onClick={() => {
                const item = inventory.find((i) => i.artifactId === artifact.id);
                if (item) setSelected(item);
              }}
              className={`hud-panel aspect-square flex flex-col items-center justify-center gap-1.5 p-2 relative ${
                owned ? "" : "opacity-35 grayscale"
              }`}
            >
              {count > 1 && (
                <span className="absolute top-1.5 right-1.5 text-[9px] font-mono bg-void-600 rounded-full px-1.5 py-0.5">
                  x{count}
                </span>
              )}
              <div className={`w-9 h-9 rounded-full border flex items-center justify-center ${owned ? RARITY_COLORS[artifact.rarity] : "border-void-600 text-slate-600"}`}>
                <DynamicIcon name={artifact.icon} size={18} />
              </div>
              <span className="text-[10px] text-center leading-tight font-mono text-slate-400">
                {owned ? artifact.name : "???"}
              </span>
            </button>
          );
        })}
      </div>

      {selected && (
        <ArtifactDetail item={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function ArtifactDetail({ item, onClose }: { item: InventoryItem; onClose: () => void }) {
  const artifact = getArtifactById(item.artifactId);
  if (!artifact) return null;

  return (
    <div className="fixed inset-0 z-[1400] flex items-center justify-center bg-void-950/80 backdrop-blur-md p-4" onClick={onClose}>
      <div className="hud-panel w-full max-w-sm p-6 text-center relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-slate-300">
          <X size={18} />
        </button>
        <div className={`mx-auto w-20 h-20 rounded-full border-2 flex items-center justify-center ${RARITY_COLORS[artifact.rarity]}`}>
          <DynamicIcon name={artifact.icon} size={34} />
        </div>
        <h3 className="mt-4 text-lg font-display font-bold">{artifact.name}</h3>
        <p className={`mt-1 text-xs font-mono uppercase tracking-widest ${RARITY_COLORS[artifact.rarity].split(" ")[0]}`}>
          {artifact.rarity}
        </p>
        <p className="mt-3 text-sm text-slate-400">{artifact.description}</p>
        <p className="mt-3 text-xs italic text-slate-500 border-t border-void-600 pt-3">
          « {artifact.loreFragment} »
        </p>
        <p className="mt-3 text-[10px] font-mono text-slate-600">
          Recueilli le {new Date(item.collectedAt).toLocaleDateString("fr-FR")}
        </p>
      </div>
    </div>
  );
}
