import { useEffect, useRef } from "react";
import L from "leaflet";
import { useGameStore } from "@/store/useGameStore";
import { drawFog } from "@/lib/fogRenderer";
import { chestIconHtml, ensureMapIconStyles, playerIconHtml } from "@/lib/mapIcons";
import { isChestInReach } from "@/lib/loot";
import type { LatLng } from "@/types";

const TILE_URL = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

const DEFAULT_CENTER: LatLng = { lat: 48.8566, lng: 2.3522 }; // Paris, en attendant le GPS

interface MapViewProps {
  liveHeading: number | null;
  liveAccuracy: number | null;
  followPlayer: boolean;
  onChestClick: (chestId: string, inReach: boolean) => void;
  onMapDragged: () => void;
}

export function MapView({
  liveHeading,
  liveAccuracy,
  followPlayer,
  onChestClick,
  onMapDragged,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const playerMarkerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const chestMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const hasCenteredRef = useRef(false);

  const position = useGameStore((s) => s.lastKnownPosition);
  const chests = useGameStore((s) => s.chests);
  const fogCellKeys = useGameStore((s) => s.fogCellKeys);

  // --- Initialisation de la carte (une seule fois) ---
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    ensureMapIconStyles();

    const map = L.map(containerRef.current, {
      center: [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng],
      zoom: 17,
      zoomControl: false,
      attributionControl: true,
      minZoom: 3,
      maxZoom: 19,
    });

    L.tileLayer(TILE_URL, {
      attribution: TILE_ATTRIBUTION,
      subdomains: "abcd",
      maxZoom: 20,
    }).addTo(map);

    const canvas = document.createElement("canvas");
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "450";
    map.getPanes().overlayPane.parentElement?.appendChild(canvas);
    canvasRef.current = canvas;

    const redraw = () => {
      if (!canvasRef.current) return;
      drawFog(canvasRef.current, map, { fogCellKeys: useGameStore.getState().fogCellKeys });
    };

    map.on("move zoom viewreset resize", redraw);
    map.on("dragstart", onMapDragged);
    mapRef.current = map;
    redraw();

    return () => {
      map.off();
      map.remove();
      mapRef.current = null;
      canvasRef.current?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Redessine le brouillard quand les cellules révélées changent ---
  useEffect(() => {
    const map = mapRef.current;
    const canvas = canvasRef.current;
    if (!map || !canvas) return;
    drawFog(canvas, map, { fogCellKeys });
  }, [fogCellKeys]);

  // --- Marqueur joueur + cercle de précision + centrage caméra ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !position) return;

    if (!playerMarkerRef.current) {
      playerMarkerRef.current = L.marker([position.lat, position.lng], {
        icon: L.divIcon({
          html: playerIconHtml(liveHeading),
          className: "",
          iconSize: [54, 54],
          iconAnchor: [27, 27],
        }),
        zIndexOffset: 1000,
        interactive: false,
      }).addTo(map);
    } else {
      playerMarkerRef.current.setLatLng([position.lat, position.lng]);
      playerMarkerRef.current.setIcon(
        L.divIcon({
          html: playerIconHtml(liveHeading),
          className: "",
          iconSize: [54, 54],
          iconAnchor: [27, 27],
        })
      );
    }

    if (liveAccuracy) {
      if (!accuracyCircleRef.current) {
        accuracyCircleRef.current = L.circle([position.lat, position.lng], {
          radius: liveAccuracy,
          color: "#22D3EE",
          weight: 1,
          opacity: 0.25,
          fillColor: "#22D3EE",
          fillOpacity: 0.06,
          interactive: false,
        }).addTo(map);
      } else {
        accuracyCircleRef.current.setLatLng([position.lat, position.lng]);
        accuracyCircleRef.current.setRadius(liveAccuracy);
      }
    }

    if (!hasCenteredRef.current) {
      map.setView([position.lat, position.lng], 18);
      hasCenteredRef.current = true;
    } else if (followPlayer) {
      map.panTo([position.lat, position.lng], { animate: true, duration: 0.6 });
    }
  }, [position, liveHeading, liveAccuracy, followPlayer]);

  // --- Marqueurs de coffres (ajout / suppression / mise à jour) ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const existing = chestMarkersRef.current;
    const activeIds = new Set<string>();

    for (const chest of chests) {
      if (chest.openedAt !== null) continue;
      activeIds.add(chest.id);
      const inReach = position ? isChestInReach(position, chest) : false;
      const html = chestIconHtml(chest.kind, inReach);

      let marker = existing.get(chest.id);
      if (!marker) {
        marker = L.marker([chest.position.lat, chest.position.lng], {
          icon: L.divIcon({ html, className: "", iconSize: [34, 34], iconAnchor: [17, 17] }),
        });
        marker.on("click", () => onChestClick(chest.id, inReach));
        marker.addTo(map);
        existing.set(chest.id, marker);
      } else {
        marker.setIcon(L.divIcon({ html, className: "", iconSize: [34, 34], iconAnchor: [17, 17] }));
      }
    }

    for (const [id, marker] of existing) {
      if (!activeIds.has(id)) {
        marker.remove();
        existing.delete(id);
      }
    }
  }, [chests, position, onChestClick]);

  return <div ref={containerRef} className="absolute inset-0 bg-void-950" />;
}
