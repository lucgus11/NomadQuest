import type { ChestNode, LatLng } from "@/types";
import { haversineDistance } from "@/lib/geoUtils";
import { CHEST_OPEN_RADIUS_METERS } from "@/lib/chestField";

export { CHEST_OPEN_RADIUS_METERS } from "@/lib/chestField";

export function distanceToChest(playerPos: LatLng, chest: ChestNode): number {
  return haversineDistance(playerPos, chest.position);
}

export function isChestInReach(playerPos: LatLng, chest: ChestNode): boolean {
  return distanceToChest(playerPos, chest) <= CHEST_OPEN_RADIUS_METERS;
}
