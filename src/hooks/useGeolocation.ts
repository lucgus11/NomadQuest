import { useEffect, useRef, useState } from "react";
import type { LatLng } from "@/types";

export interface GeoState {
  position: LatLng | null;
  accuracy: number | null;
  heading: number | null;
  speedKmh: number | null;
  error: string | null;
  isTracking: boolean;
  permission: "unknown" | "granted" | "denied" | "prompt";
}

interface Options {
  enabled: boolean;
  onPosition?: (pos: LatLng, timestamp: number, accuracy: number | null) => void;
}

const GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 1000,
  timeout: 15000,
};

/** Filtre les positions manifestement aberrantes (précision GPS trop faible). */
const MAX_ACCEPTABLE_ACCURACY_M = 60;

export function useGeolocation({ enabled, onPosition }: Options): GeoState {
  const [state, setState] = useState<GeoState>({
    position: null,
    accuracy: null,
    heading: null,
    speedKmh: null,
    error: null,
    isTracking: false,
    permission: "unknown",
  });

  const watchIdRef = useRef<number | null>(null);
  const onPositionRef = useRef(onPosition);
  onPositionRef.current = onPosition;

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setState((s) => ({ ...s, error: "Géolocalisation non disponible sur cet appareil." }));
      return;
    }

    if (!enabled) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setState((s) => ({ ...s, isTracking: false }));
      return;
    }

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy, heading, speed } = pos.coords;
        if (accuracy > MAX_ACCEPTABLE_ACCURACY_M) {
          setState((s) => ({ ...s, accuracy, isTracking: true, error: null }));
          return;
        }
        const latLng: LatLng = { lat: latitude, lng: longitude };
        setState((s) => ({
          ...s,
          position: latLng,
          accuracy,
          heading: heading ?? s.heading,
          speedKmh: speed !== null ? speed * 3.6 : s.speedKmh,
          isTracking: true,
          error: null,
          permission: "granted",
        }));
        onPositionRef.current?.(latLng, pos.timestamp, accuracy);
      },
      (err) => {
        setState((s) => ({
          ...s,
          error: err.message || "Impossible d'obtenir la position.",
          isTracking: false,
          permission: err.code === err.PERMISSION_DENIED ? "denied" : s.permission,
        }));
      },
      GEO_OPTIONS
    );
    watchIdRef.current = id;

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [enabled]);

  return state;
}

/** Demande explicitement la permission (utile pour un bouton "Activer le GPS"). */
export function requestGeoPermissionOnce(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, GEO_OPTIONS);
  });
}
