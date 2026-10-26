import { latLngToCell } from "h3-js";

// H3 resolution. It MUST match the resolution used by the backend,
// otherwise the same place gets different hexagon IDs on FE and BE.
export const H3_RES = 9;

/**
 * Converts coordinates into an H3 cell ID on the frontend (no backend request).
 * Throws RangeError for invalid coordinates so callers can handle bad input explicitly.
 */
export function coordsToH3(lat: number, lng: number): string {
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    throw new RangeError(`Invalid coordinates: lat=${lat}, lng=${lng}`);
  }
  return latLngToCell(lat, lng, H3_RES);
}
