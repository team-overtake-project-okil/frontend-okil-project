import cityBoundary from "../data/lviv-city.json";

const rings = cityBoundary.coordinates;

// Check whether a point is inside a polygon ring.
function isInRing(lng: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const cross = (lng - xi) * (yj - yi) - (lat - yi) * (xj - xi);
    if ((xi !== xj || yi !== yj) && Math.abs(cross) < 1e-12 &&
      lng >= Math.min(xi, xj) && lng <= Math.max(xi, xj) &&
      lat >= Math.min(yi, yj) && lat <= Math.max(yi, yj)) return true;
    if ((yi > lat) !== (yj > lat) &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// Check the city boundary, excluding polygon holes.
export function isInLviv(lng: number, lat: number): boolean {
  return isInRing(lng, lat, rings[0]) &&
    !rings.slice(1).some((ring) => isInRing(lng, lat, ring));
}

export function lvivBbox(): string {
  const points = rings.flat();
  return [
    Math.min(...points.map(([lng]) => lng)), Math.min(...points.map(([, lat]) => lat)),
    Math.max(...points.map(([lng]) => lng)), Math.max(...points.map(([, lat]) => lat)),
  ].join(",");
}
