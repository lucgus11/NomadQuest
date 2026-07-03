import type L from "leaflet";
import { FOG_CELL_SIZE_METERS, cellKey, latLngToCell } from "@/lib/fog";
import { metersPerDegreeLng, METERS_PER_DEGREE_LAT } from "@/lib/geoUtils";

interface DrawFogOptions {
  fogCellKeys: Set<string>;
  fogColor?: string;
  /** Cellules "en cours de dissipation" (animation), avec une opacité 0..1. */
  dissolving?: Map<string, number>;
}

/** Dessine le brouillard opaque sur tout le canvas, puis découpe (compose
 * "destination-out") un disque doux pour chaque cellule révélée visible à
 * l'écran. Beaucoup plus performant qu'itérer sur toutes les cellules
 * connues : on ne parcourt que la grille visible dans les bounds actuels. */
export function drawFog(
  canvas: HTMLCanvasElement,
  map: L.Map,
  { fogCellKeys, fogColor = "rgba(4, 8, 16, 0.94)", dissolving }: DrawFogOptions
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const size = map.getSize();
  if (canvas.width !== size.x * dpr || canvas.height !== size.y * dpr) {
    canvas.width = size.x * dpr;
    canvas.height = size.y * dpr;
    canvas.style.width = `${size.x}px`;
    canvas.style.height = `${size.y}px`;
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, size.x, size.y);
  ctx.fillStyle = fogColor;
  ctx.fillRect(0, 0, size.x, size.y);

  const bounds = map.getBounds().pad(0.25);
  const nw = bounds.getNorthWest();
  const se = bounds.getSouthEast();

  const cellNW = latLngToCell({ lat: nw.lat, lng: nw.lng });
  const cellSE = latLngToCell({ lat: se.lat, lng: se.lng });

  const gxMin = Math.min(cellNW.gx, cellSE.gx);
  const gxMax = Math.max(cellNW.gx, cellSE.gx);
  const gyMin = Math.min(cellNW.gy, cellSE.gy);
  const gyMax = Math.max(cellNW.gy, cellSE.gy);

  // Sécurité : si l'utilisateur dézoome énormément, on ne tente pas de
  // dessiner des millions de cellules individuelles.
  const totalCells = (gxMax - gxMin + 1) * (gyMax - gyMin + 1);
  if (totalCells > 60000) {
    return;
  }

  ctx.globalCompositeOperation = "destination-out";

  const refLat = map.getCenter().lat;
  const mPerLng = metersPerDegreeLng(refLat);
  // Rayon du disque en pixels, légèrement plus grand que la cellule pour
  // que les cellules adjacentes se fondent sans laisser de grille visible.
  const cellPixelWidth =
    map.latLngToContainerPoint([refLat, (FOG_CELL_SIZE_METERS / mPerLng)]).x -
    map.latLngToContainerPoint([refLat, 0]).x;
  const holeRadiusPx = Math.max(4, Math.abs(cellPixelWidth) * 0.72);

  for (let gx = gxMin; gx <= gxMax; gx++) {
    for (let gy = gyMin; gy <= gyMax; gy++) {
      const key = cellKey(gx, gy);
      const isRevealed = fogCellKeys.has(key);
      const dissolveAlpha = dissolving?.get(key);
      if (!isRevealed && dissolveAlpha === undefined) continue;

      const lat = (gy * FOG_CELL_SIZE_METERS) / METERS_PER_DEGREE_LAT;
      const lng = (gx * FOG_CELL_SIZE_METERS) / mPerLng;
      const point = map.latLngToContainerPoint([lat, lng]);

      ctx.globalAlpha = dissolveAlpha !== undefined ? dissolveAlpha : 1;
      ctx.beginPath();
      ctx.arc(point.x, point.y, holeRadiusPx, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}
