// Сітка Львова: поворот карти, межі міста і полігони гексагонів
import mapboxgl from "mapbox-gl";
import { cellToBoundary, cellToLatLng, polygonToCells } from "h3-js";
import cityBoundary from "../../data/lviv-city.json";
import { H3_RES, coordsToH3 } from "../../lib/h3";
import type { Hexagon } from "../map/hexagonRating";

export const LVIV_LAT = 49.8429;
export const LVIV_LNG = 24.0316;
export const SELECTION_ZOOM = 13.5;

// Align a vertex of the central H3 cell with the vertical screen axis.
const referenceHex = coordsToH3(LVIV_LAT, LVIV_LNG);
const [referenceLat, referenceLng] = cellToLatLng(referenceHex);
const [vertexLat, vertexLng] = cellToBoundary(referenceHex).reduce(
  (northmost, vertex) => (vertex[0] > northmost[0] ? vertex : northmost),
);
const referencePoint = mapboxgl.MercatorCoordinate.fromLngLat([
  referenceLng,
  referenceLat,
]);
const vertexPoint = mapboxgl.MercatorCoordinate.fromLngLat([
  vertexLng,
  vertexLat,
]);
export const GRID_BEARING =
  (Math.atan2(
    vertexPoint.x - referencePoint.x,
    referencePoint.y - vertexPoint.y,
  ) *
    180) /
  Math.PI;

export const cityBounds = new mapboxgl.LngLatBounds();
for (const [lng, lat] of cityBoundary.coordinates[0]) {
  cityBounds.extend([lng, lat]);
}

// Administrative boundary of the city of Lviv (OSM relation 2032280).
const lvivCellIds = polygonToCells(cityBoundary.coordinates, H3_RES, true);

function overallScore(hex: Hexagon) {
  return hex.overall_rating;
}

export function lvivHexes(hexagons: Hexagon[]) {
  const scoreById = new Map(
    hexagons.map((hex) => [hex.h3_id, overallScore(hex)] as const),
  );
  const ids = new Set<string>(lvivCellIds);

  return {
    type: "FeatureCollection" as const,
    features: [...ids].map((id) => {
      const score = scoreById.get(id);
      return {
        type: "Feature" as const,
        properties: score === undefined ? { id } : { id, score },
        geometry: {
          type: "Polygon" as const,
          coordinates: [cellToBoundary(id, true)],
        },
      };
    }),
  };
}

export function hexScoreIndex(hexes: ReturnType<typeof lvivHexes>) {
  return new Map<string, number | undefined>(
    hexes.features.map((feature) => [
      feature.properties.id,
      "score" in feature.properties ? feature.properties.score : undefined,
    ]),
  );
}
