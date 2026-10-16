import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { cellToBoundary, gridDisk, latLngToCell } from "h3-js";

const token = import.meta.env.VITE_MAPBOX_TOKEN;

const LVIV_LAT = 49.8429;
const LVIV_LNG = 24.0316;
const H3_RES = 9;
const H3_RING = 5;

// Placeholder tint so the grid reads as a score layer until real data is wired.
function placeholderScore(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 33 + id.charCodeAt(i)) >>> 0;
  }
  return hash % 101;
}

function lvivHexes() {
  const origin = latLngToCell(LVIV_LAT, LVIV_LNG, H3_RES);

  return {
    type: "FeatureCollection",
    features: gridDisk(origin, H3_RING).map((id) => ({
      type: "Feature",
      properties: { id, score: placeholderScore(id), selected: id === origin },
      geometry: {
        type: "Polygon",
        coordinates: [cellToBoundary(id, true)],
      },
    })),
  };
}

export function MapboxMap() {
  const mapContainer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapContainer.current || !token) return;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      accessToken: token,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [LVIV_LNG, LVIV_LAT],
      zoom: 12,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.on("load", () => {
      map.addSource("h3-hexes", {
        type: "geojson",
        data: lvivHexes(),
      });

      map.addLayer({
        id: "h3-hexes-fill",
        type: "fill",
        source: "h3-hexes",
        paint: {
          "fill-color": [
            "interpolate",
            ["linear"],
            ["get", "score"],
            0,
            "#FF3B30",
            50,
            "#FFCC00",
            100,
            "#34C759",
          ],
          "fill-opacity": 0.38,
        },
      });

      map.addLayer({
        id: "h3-hexes-line",
        type: "line",
        source: "h3-hexes",
        paint: {
          "line-color": "#1C1C1E",
          "line-width": 1,
          "line-opacity": 0.4,
        },
      });

      map.addLayer({
        id: "h3-hexes-selected",
        type: "line",
        source: "h3-hexes",
        filter: ["==", ["get", "selected"], true],
        paint: {
          "line-color": "#007AFF",
          "line-width": 2.5,
        },
      });
    });

    return () => {
      map.remove();
    };
  }, []);

  if (!token) {
    return <p>Mapbox token is missing.</p>;
  }

  return (
    <div
      ref={mapContainer}
      className="h-[500px] w-full overflow-hidden rounded-2xl"
    />
  );
}
