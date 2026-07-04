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
  onPosition?: (
    pos: LatLng,
    timestamp: number,
    accuracy: number | null,
    speedKmh: number | null
  ) => void;
}

const GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 1000,
  timeout: 15000,
};

/** Au-delà de cette précision, on prévient l'utilisateur (mais on ne bloque
 * plus silencieusement la position : mieux vaut un signal imprécis affiché
 * avec un avertissement qu'un écran qui semble cassé). */
const POOR_ACCURACY_WARNING_M = 100;

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
        const latLng: LatLng = { lat: latitude, lng: longitude };
        const speedKmh = speed !== null && speed >= 0 ? speed * 3.6 : null;
        setState((s) => ({
          ...s,
          position: latLng,
          accuracy,
          heading: heading ?? s.heading,
          speedKmh: speedKmh ?? s.speedKmh,
          isTracking: true,
          error: null,
          permission: "granted",
        }));
        onPositionRef.current?.(latLng, pos.timestamp, accuracy, speedKmh);
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

export { POOR_ACCURACY_WARNING_M };

/** Demande explicitement la permission (utile pour un bouton "Activer le GPS"). */
export function requestGeoPermissionOnce(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, GEO_OPTIONS);
  });
}
