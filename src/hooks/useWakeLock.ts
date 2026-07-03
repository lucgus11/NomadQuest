import { useCallback, useEffect, useRef, useState } from "react";
import { isWakeLockSupported, requestWakeLock, type WakeLockLike } from "@/lib/wakelock";

export function useWakeLock() {
  const [enabled, setEnabled] = useState(true); // préférence utilisateur
  const [active, setActive] = useState(false); // état réel du verrou
  const sentinelRef = useRef<WakeLockLike | null>(null);
  const supported = isWakeLockSupported();

  const acquire = useCallback(async () => {
    if (!enabled || !supported) return;
    const sentinel = await requestWakeLock();
    if (sentinel) {
      sentinelRef.current = sentinel;
      setActive(true);
      sentinel.addEventListener("release", () => setActive(false));
    }
  }, [enabled, supported]);

  const release = useCallback(async () => {
    if (sentinelRef.current) {
      await sentinelRef.current.release();
      sentinelRef.current = null;
    }
    setActive(false);
  }, []);

  // Ré-acquiert le verrou quand l'onglet redevient visible (le navigateur
  // libère automatiquement le wake lock quand la page passe en arrière-plan).
  useEffect(() => {
    if (!enabled) {
      release();
      return;
    }
    acquire();

    const onVisibility = () => {
      if (document.visibilityState === "visible") acquire();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      release();
    };
  }, [enabled, acquire, release]);

  return {
    supported,
    active,
    enabled,
    toggle: () => setEnabled((v) => !v),
  };
}
