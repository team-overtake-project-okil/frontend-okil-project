import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  cellToBoundary,
  gridDistance,
  latLngToCell,
  polygonToCells,
} from "h3-js";
import cityBoundary from "../data/lviv-city.json";

const token = import.meta.env.VITE_MAPBOX_TOKEN;

const LVIV_LAT = 49.8429;
const LVIV_LNG = 24.0316;
const H3_RES = 9;

// Administrative boundary of the city of Lviv (OSM relation 2032280).
function lvivHexes() {
  const origin = latLngToCell(LVIV_LAT, LVIV_LNG, H3_RES);
  const cells = polygonToCells(cityBoundary.coordinates, H3_RES, true);
  const maxSteps = Math.max(...cells.map((id) => gridDistance(origin, id)));

  return {
    type: "FeatureCollection" as const,
    features: cells.map((id) => {
      const steps = gridDistance(origin, id);
      const score =
        maxSteps === 0 ? 100 : Math.round(100 * (1 - steps / maxSteps));
      return {
        type: "Feature" as const,
        properties: { id, score, selected: id === origin },
        geometry: {
          type: "Polygon" as const,
          coordinates: [cellToBoundary(id, true)],
        },
      };
    }),
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
      const hexes = lvivHexes();

      map.addSource("h3-hexes", {
        type: "geojson",
        data: hexes,
      });

      const bounds = new mapboxgl.LngLatBounds();
      for (const [lng, lat] of cityBoundary.coordinates[0]) {
        bounds.extend([lng, lat]);
      }
      map.fitBounds(bounds, { padding: 24, duration: 0 });

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
          //побавитись з опасіті
          "fill-opacity": 0.5,
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

      //щоб видалити обводку - забрати цей блок
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
      className="h-125 w-full overflow-hidden rounded-2xl"
    />
  );
}
