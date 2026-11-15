// Контури і літери ділянок, доданих до порівняння
import mapboxgl from "mapbox-gl";
import { cellToBoundary, cellToLatLng } from "h3-js";
import {
  comparisonColors,
  comparisonLabels,
} from "../../lib/hexagonAssessment";
import { SELECTION_ZOOM } from "./lvivGrid";

export function mountComparison(
  map: mapboxgl.Map,
  comparisonIds: readonly string[],
) {
  const apply = () => {
    const source = map.getSource<mapboxgl.GeoJSONSource>("h3-comparison");
    source?.setData({
      type: "FeatureCollection",
      features: comparisonIds.map((id, index) => ({
        type: "Feature" as const,
        properties: { color: comparisonColors[index] },
        geometry: {
          type: "Polygon" as const,
          coordinates: [cellToBoundary(id, true)],
        },
      })),
    });
  };

  const labels = comparisonIds.map((id, index) => {
    const [lat, lng] = cellToLatLng(id);
    const element = document.createElement("span");
    element.className = "comparison-map-label";
    element.textContent = comparisonLabels[index];
    element.style.color = comparisonColors[index];
    element.setAttribute("aria-hidden", "true");
    return new mapboxgl.Marker({ element }).setLngLat([lng, lat]).addTo(map);
  });

  const resizeLabels = () => {
    const scale = Math.min(1, 2 ** (map.getZoom() - SELECTION_ZOOM));
    for (const label of labels) {
      const element = label.getElement();
      element.style.setProperty(
        "--comparison-label-size",
        `${Math.max(12, 18 * scale)}px`,
      );
      element.hidden = scale < 0.35;
    }
  };
  resizeLabels();
  map.on("zoom", resizeLabels);

  if (map.getSource("h3-comparison")) {
    apply();
  } else {
    map.once("load", apply);
  }

  return () => {
    map.off("load", apply);
    map.off("zoom", resizeLabels);
    labels.forEach((label) => label.remove());
  };
}
