import { useEffect, useState } from "react";
import { X, PackageOpen, MapPinned, Sparkles, icons } from "lucide-react";
import type { ChestNode } from "@/types";
import { getArtifactById } from "@/data/artifacts";
import { RARITY_COLORS } from "@/data/artifacts";
import { CHEST_OPEN_RADIUS_METERS, distanceToChest } from "@/lib/loot";
import { useGameStore } from "@/store/useGameStore";

const KIND_LABEL: Record<ChestNode["kind"], string> = {
  commun: "Coffre Commun",
  rare: "Coffre Rare",
  légendaire: "Coffre Légendaire",
};

function DynamicIcon({ name, ...props }: { name: string; size?: number; className?: string }) {
  const Icon = (icons as Record<string, React.ComponentType<{ size?: number; className?: string }>>)[name];
  if (!Icon) return <Sparkles {...props} />;
  return <Icon {...props} />;
}

export function ChestApproachSheet({
  chest,
  onClose,
}: {
  chest: ChestNode;
  onClose: () => void;
}) {
  const position = useGameStore((s) => s.lastKnownPosition);
  const openChest = useGameStore((s) => s.openChest);
  const [opening, setOpening] = useState(false);

  const distance = position ? distanceToChest(position, chest) : null;
  const inReach = distance !== null && distance <= CHEST_OPEN_RADIUS_METERS;

  const handleOpen = async () => {
    setOpening(true);
    await new Promise((r) => setTimeout(r, 900)); // laisse respirer l'animation
    await openChest(chest.id);
    setOpening(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[1400] flex items-end justify-center bg-void-950/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md hud-panel m-3 p-5 animate-float-y"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-widest text-relic-400">
              {KIND_LABEL[chest.kind]}
            </p>
            <h3 className="text-lg font-semibold mt-0.5">Signal détecté</h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <X size={20} />
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2 text-sm text-slate-400 font-mono">
          <MapPinned size={16} className="text-signal-400" />
          {distance !== null
            ? `${Math.round(distance)} m — ${inReach ? "à portée" : `approchez-vous à ${CHEST_OPEN_RADIUS_METERS}m`}`
            : "Position inconnue"}
        </div>

        <div className="mt-3 w-full h-2 bg-void-600 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${inReach ? "bg-signal-glow" : "bg-relic-500"}`}
            style={{
              width: `${Math.max(6, Math.min(100, 100 - ((distance ?? 200) / 220) * 100))}%`,
            }}
          />
        </div>

        <button
          disabled={!inReach || opening}
          onClick={handleOpen}
          className={`mt-5 w-full py-3 rounded-md font-display font-semibold tracking-wide flex items-center justify-center gap-2 transition-all ${
            inReach
              ? "bg-relic-500 text-void-950 shadow-glow-relic hover:bg-relic-400 active:scale-[0.98]"
              : "bg-void-600 text-slate-500 cursor-not-allowed"
          }`}
        >
          <PackageOpen size={18} className={opening ? "animate-bounce" : ""} />
          {opening ? "Ouverture..." : inReach ? "Ouvrir le coffre" : "Trop loin"}
        </button>
      </div>
    </div>
  );
}

export function RewardModal({
  artifactId,
  chestKind,
  onClose,
}: {
  artifactId: string;
  chestKind: ChestNode["kind"];
  onClose: () => void;
}) {
  const artifact = getArtifactById(artifactId);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 150);
    return () => clearTimeout(t);
  }, []);

  if (!artifact) return null;

  return (
    <div className="fixed inset-0 z-[1500] flex items-center justify-center bg-void-950/80 backdrop-blur-md p-4">
      <div className="relative w-full max-w-sm hud-panel p-6 text-center overflow-hidden">
        <div className="absolute inset-0 bg-radial-fade pointer-events-none" />
        <p className="relative text-[11px] font-mono uppercase tracking-[0.3em] text-relic-400">
          {KIND_LABEL[chestKind]} ouvert
        </p>

        <div
          className={`relative mx-auto mt-5 w-24 h-24 rounded-full border-2 flex items-center justify-center transition-all duration-700 ${
            RARITY_COLORS[artifact.rarity]
          } ${revealed ? "scale-100 opacity-100" : "scale-50 opacity-0"}`}
          style={{ boxShadow: revealed ? "0 0 40px rgba(240,169,59,0.35)" : "none" }}
        >
          <DynamicIcon name={artifact.icon} size={40} />
        </div>

        <h3 className="relative mt-4 text-xl font-display font-bold">{artifact.name}</h3>
        <p className={`relative mt-1 text-xs font-mono uppercase tracking-widest ${RARITY_COLORS[artifact.rarity].split(" ")[0]}`}>
          {artifact.rarity}
        </p>
        <p className="relative mt-3 text-sm text-slate-400">{artifact.description}</p>
        <p className="relative mt-3 text-xs italic text-slate-500 border-t border-void-600 pt-3">
          « {artifact.loreFragment} »
        </p>

        <button
          onClick={onClose}
          className="relative mt-6 w-full py-3 rounded-md bg-signal-500 text-void-950 font-semibold hover:bg-signal-400 active:scale-[0.98] transition-all"
        >
          Ranger dans le sac
        </button>
      </div>
    </div>
  );
}
