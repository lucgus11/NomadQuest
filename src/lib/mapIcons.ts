import type { ChestKind } from "@/types";

const CHEST_COLORS: Record<ChestKind, { glow: string; fill: string; ring: string }> = {
  commun: { glow: "rgba(148,163,184,0.55)", fill: "#94A3B8", ring: "#CBD5E1" },
  rare: { glow: "rgba(34,211,238,0.65)", fill: "#22D3EE", ring: "#5EEAD4" },
  légendaire: { glow: "rgba(240,169,59,0.8)", fill: "#F0A93B", ring: "#F7C873" },
};

export function chestIconHtml(kind: ChestKind, inReach: boolean): string {
  const c = CHEST_COLORS[kind];
  const pulse = inReach
    ? `<span style="position:absolute;inset:-10px;border-radius:9999px;border:2px solid ${c.ring};animation:nq-pulse 1.6s ease-out infinite;"></span>`
    : "";
  return `
  <div style="position:relative;width:34px;height:34px;display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 0 8px ${c.glow});animation:nq-float 3s ease-in-out infinite;">
    ${pulse}
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="9" width="18" height="11" rx="1.5" fill="${c.fill}" stroke="${c.ring}" stroke-width="1.4"/>
      <path d="M3 11h18" stroke="#0D1420" stroke-width="1" opacity="0.5"/>
      <rect x="10" y="12.5" width="4" height="3.2" rx="0.6" fill="#0D1420"/>
      <path d="M6 9V7a6 6 0 0 1 12 0v2" stroke="${c.ring}" stroke-width="1.6" fill="none"/>
    </svg>
  </div>`;
}

export function playerIconHtml(headingDeg: number | null): string {
  const rotation = headingDeg ?? 0;
  return `
  <div style="position:relative;width:54px;height:54px;display:flex;align-items:center;justify-content:center;">
    <span style="position:absolute;inset:0;border-radius:9999px;background:radial-gradient(circle, rgba(34,211,238,0.35) 0%, rgba(34,211,238,0) 70%);animation:nq-pulse-ring 2.2s cubic-bezier(0,0.6,0.4,1) infinite;"></span>
    <span style="position:absolute;width:16px;height:16px;border-radius:9999px;background:#22D3EE;box-shadow:0 0 14px 4px rgba(34,211,238,0.75);border:2px solid #eafffb;"></span>
    <span style="position:absolute;transform:rotate(${rotation}deg);width:54px;height:54px;">
      <svg width="54" height="54" viewBox="0 0 54 54">
        <path d="M27 6 L32 20 L27 16 L22 20 Z" fill="#5EEAD4" opacity="${headingDeg !== null ? 1 : 0}"/>
      </svg>
    </span>
  </div>`;
}

/** Styles d'animation injectés une seule fois pour les divIcons Leaflet
 * (celles-ci vivent hors de l'arbre React donc Tailwind ne les stylise pas). */
export function ensureMapIconStyles() {
  if (document.getElementById("nq-map-icon-styles")) return;
  const style = document.createElement("style");
  style.id = "nq-map-icon-styles";
  style.textContent = `
    @keyframes nq-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
    @keyframes nq-pulse { 0% { transform: scale(0.7); opacity: 1; } 100% { transform: scale(1.6); opacity: 0; } }
    @keyframes nq-pulse-ring { 0% { transform: scale(0.5); opacity: 0.9; } 100% { transform: scale(2.4); opacity: 0; } }
  `;
  document.head.appendChild(style);
}
