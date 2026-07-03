export type WakeLockLike = {
  release: () => Promise<void>;
  addEventListener: (type: "release", cb: () => void) => void;
};

export function isWakeLockSupported(): boolean {
  return typeof navigator !== "undefined" && "wakeLock" in navigator;
}

export async function requestWakeLock(): Promise<WakeLockLike | null> {
  if (!isWakeLockSupported()) return null;
  try {
    const sentinel = await navigator.wakeLock.request("screen");
    return sentinel as WakeLockLike;
  } catch {
    return null;
  }
}
