import mapboxgl from "mapbox-gl";
import { cellToLatLng } from "h3-js";
import { expect, it } from "vitest";
import type { HexagonRouteFeature, HexagonRoutes } from "../lib/hexagonAssessment";
import { comparisonLabelAppearance } from "../components/mapbox/syncComparison";
import { SELECTION_ZOOM } from "../components/mapbox/lvivGrid";
import { clipRoutesAroundOrigin } from "../components/mapbox/clipRoutesAroundOrigin";

it("cuts the route near the label without moving the layers or the remaining route", () => {
  const id = "891f2242c0fffff";
  const [lat, lng] = cellToLatLng(id);
  const map = {
    project(coordinates: mapboxgl.LngLatLike) {
      const point = mapboxgl.LngLat.convert(coordinates);
      return new mapboxgl.Point((point.lng - lng) * 1000, (point.lat - lat) * 1000);
    },
    unproject(point: mapboxgl.PointLike) {
      const projected = mapboxgl.Point.convert(point);
      return new mapboxgl.LngLat(lng + projected.x / 1000, lat + projected.y / 1000);
    },
  };
  const feature = (offsets: number[]): HexagonRouteFeature => ({
    type: "Feature",
    properties: {
      transport_mode: "walk", mode: "walk", section_type: "walk",
      route_index: 0, section_index: 0, color: "#31523e", line_style: "dashed",
    },
    geometry: {
      type: "LineString",
      coordinates: offsets.map((offset) => [lng + offset / 1000, lat]),
    },
  });
  const routes: HexagonRoutes = {
    type: "FeatureCollection",
    features: [feature([-30, 30]), feature([0, 5]), feature([40, 60])],
  };
  const clipped = clipRoutesAroundOrigin(map, routes, id, 17);

  expect(clipped.features.map(({ geometry }) => geometry.coordinates.map(
    (coordinate) => Math.round(map.project(coordinate).x),
  ))).toEqual([[-30, -17], [17, 30], [40, 60]]);
  const smallerGap = clipRoutesAroundOrigin(map, routes, id, 11);
  expect(Math.round(map.project(smallerGap.features[1].geometry.coordinates[0]).x)).toBe(11);
  expect(clipped.features[0].properties).toBe(routes.features[0].properties);
  expect(routes.features).toHaveLength(3);
});

it("fades the gap and the marker together at overview zoom", () => {
  expect(comparisonLabelAppearance(SELECTION_ZOOM).visibility).toBe(1);
  const zoomInFadeRange = SELECTION_ZOOM + Math.log2(0.41);
  expect(comparisonLabelAppearance(zoomInFadeRange).visibility).toBeCloseTo(0.5);
  expect(comparisonLabelAppearance(SELECTION_ZOOM - 2).visibility).toBe(0);
});