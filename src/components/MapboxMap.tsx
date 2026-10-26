import { useCallback, useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  cellToBoundary,
  cellToLatLng,
  gridDistance,
  polygonToCells,
} from "h3-js";
import cityBoundary from "../data/lviv-city.json";
import { H3_RES, coordsToH3 } from "../lib/h3";
import { useRoutesByHex } from "../lib/useRoutesByHex";

const token = import.meta.env.VITE_MAPBOX_TOKEN;

const LVIV_LAT = 49.8429;
const LVIV_LNG = 24.0316;
const SELECTION_ZOOM = 13.5;
const SCORE_COLOR: mapboxgl.ExpressionSpecification = [
  "interpolate", ["linear"], ["get", "score"],
  0, "#FF3B30", 50, "#FFCC00", 100, "#34C759",
];
// Align a vertex of the central H3 cell with the vertical screen axis.
const referenceHex = coordsToH3(LVIV_LAT, LVIV_LNG);
const [referenceLat, referenceLng] = cellToLatLng(referenceHex);
const [vertexLat, vertexLng] = cellToBoundary(referenceHex).reduce(
  (northmost, vertex) => vertex[0] > northmost[0] ? vertex : northmost,
);
const referencePoint = mapboxgl.MercatorCoordinate.fromLngLat([referenceLng, referenceLat]);
const vertexPoint = mapboxgl.MercatorCoordinate.fromLngLat([vertexLng, vertexLat]);
const GRID_BEARING = Math.atan2(
  vertexPoint.x - referencePoint.x,
  referencePoint.y - vertexPoint.y,
) * 180 / Math.PI;

const cityBounds = new mapboxgl.LngLatBounds();
for (const [lng, lat] of cityBoundary.coordinates[0]) {
  cityBounds.extend([lng, lat]);
}
// Convert the 5 km margin to degrees at Lviv's latitude.
const latitudeMargin = 5 / 111.32;
const longitudeMargin = latitudeMargin / Math.cos(LVIV_LAT * Math.PI / 180);
const navigationBounds: [[number, number], [number, number]] = [
  [cityBounds.getWest() - longitudeMargin, cityBounds.getSouth() - latitudeMargin],
  [cityBounds.getEast() + longitudeMargin, cityBounds.getNorth() + latitudeMargin],
];

// Administrative boundary of the city of Lviv (OSM relation 2032280).
function lvivHexes() {
  const origin = coordsToH3(LVIV_LAT, LVIV_LNG);
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
        properties: { id, score },
        geometry: {
          type: "Polygon" as const,
          coordinates: [cellToBoundary(id, true)],
        },
      };
    }),
  };
}

interface MapboxMapProps {
  searchedLocation?: { lat: number; lng: number } | null;
  onHexSelect?: (hexId: string | null) => void;
  clearSelectionKey?: number;
}

export function MapboxMap({ searchedLocation, onHexSelect, clearSelectionKey }: MapboxMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const onHexSelectRef = useRef(onHexSelect);
  const hexScoresRef = useRef(new Map<string, number>());
  const [selectedHexId, setSelectedHexId] = useState<string | null>(null);
  const routesQuery = useRoutesByHex(selectedHexId);
  const routes = routesQuery.data;

  // Keep the latest callback without recreating the Mapbox map.
  // It also remembers the selected hexagon (null when the selection is cleared)
  // so that the routes of this hexagon can be loaded.
  useEffect(() => {
    onHexSelectRef.current = (hexId) => {
      setSelectedHexId(hexId);
      onHexSelect?.(hexId);
    };
  }, [onHexSelect]);

  // Use the same selection and camera behavior for addresses and map clicks.
  const selectHex = useCallback((lat: number, lng: number) => {
    const map = mapRef.current;
    if (!map) return;

    const source = map.getSource("h3-selected") as
      mapboxgl.GeoJSONSource | undefined;
    if (!source) return;

    const hexId = coordsToH3(lat, lng);
    // Only cells present in the city layer can be selected.
    if (!hexScoresRef.current.has(hexId)) return;

    const [centerLat, centerLng] = cellToLatLng(hexId);
    const score = hexScoresRef.current.get(hexId);

    source.setData({
      type: "Feature",
      properties: { id: hexId, ...(score !== undefined ? { score } : {}) },
      geometry: {
        type: "Polygon",
        coordinates: [cellToBoundary(hexId, true)],
      },
    });

    map.flyTo({
      center: [centerLng, centerLat],
      zoom: SELECTION_ZOOM,
      bearing: GRID_BEARING,
      padding: { top: 0, bottom: 0, left: 0, right: 0 },
    });
    onHexSelectRef.current?.(hexId);
  }, []);

  useEffect(() => {
    if (!mapContainer.current || !token || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      accessToken: token,
      style: "mapbox://styles/mapbox/streets-v12",
      projection: "mercator",
      center: [LVIV_LNG, LVIV_LAT],
      zoom: 12,
      minZoom: 10,
      maxBounds: navigationBounds,
      bearing: GRID_BEARING,
      // Preserve the small grid rotation when zoom gestures finish.
      bearingSnap: 0,
      pitch: 0,
      maxPitch: 0,
      dragRotate: false,
      touchPitch: false,
    });

    mapRef.current = map;
    map.touchZoomRotate.disableRotation();
    map.keyboard.disableRotation();

    const canvas = map.getCanvas();
    canvas.style.cursor = "default";

    const onMouseDown = () => {
      canvas.style.cursor = "move";
    };
    const onMouseUp = () => {
      canvas.style.cursor = "default";
    };

    map.on("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

    map.on("click", (e) => {
      selectHex(e.lngLat.lat, e.lngLat.lng);
    });

    map.on("load", () => {
      const hexes = lvivHexes();
      hexScoresRef.current = new Map(hexes.features.map(({ properties }) => [properties.id, properties.score]));

      map.addSource("h3-hexes", {
        type: "geojson",
        data: hexes,
      });

      map.fitBounds(cityBounds, { padding: 24, duration: 0, retainPadding: false, bearing: GRID_BEARING });

      map.addLayer({
        id: "h3-hexes-fill",
        type: "fill",
        source: "h3-hexes",
        paint: {
          "fill-color": SCORE_COLOR,
          "fill-opacity": 0.5,
        },
      });

      map.addLayer({
        id: "h3-hexes-line",
        type: "line",
        source: "h3-hexes",
        paint: {
          "line-color": "#8E8E93",
          "line-width": 0.6,
          "line-opacity": 0.35,
        },
      });

      // Separate GeoJSON source for the selected hexagon.
      // Selection is restricted to cells in the city layer.
      map.addSource("h3-selected", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: "h3-selected-glow",
        type: "line",
        source: "h3-selected",
        layout: { "line-join": "round" },
        paint: {
          "line-color": "#007AFF",
          "line-width": 8,
          "line-blur": 8,
          "line-opacity": 0.65,
        },
      });

      map.addLayer({
        id: "h3-hexes-selected",
        type: "line",
        source: "h3-selected",
        paint: {
          "line-color": "#007AFF",
          "line-width": 2,
          "line-opacity": 0.85,
        },
      });


      // Routes of the selected hexagon. The source starts empty and is filled
      // after the backend request finishes.
      map.addSource("routes", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      // White casing under the line keeps routes readable on top of the hexagons.
      map.addLayer({
        id: "routes-casing",
        type: "line",
        source: "routes",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#FFFFFF",
          "line-opacity": 0.85,
          "line-width": ["interpolate", ["linear"], ["zoom"], 10, 3, 16, 8],
        },
      });

      map.addLayer({
        id: "routes-line",
        type: "line",
        source: "routes",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#5B21B6",
          "line-opacity": 0.9,
          "line-width": ["interpolate", ["linear"], ["zoom"], 10, 1.5, 16, 4],
        },
      });
    });
    return () => {
      window.removeEventListener("mouseup", onMouseUp);
      map.remove();
      mapRef.current = null;
    };
  }, [selectHex]);

  // Push the routes of the selected hexagon into the map (empty when nothing is selected).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const data = routes ?? { type: "FeatureCollection" as const, features: [] };
    const apply = () => {
      const source = map.getSource("routes") as mapboxgl.GeoJSONSource | undefined;
      source?.setData(data);
    };

    if (map.getSource("routes")) {
      apply();
    } else {
      map.once("load", apply);
      return () => {
        map.off("load", apply);
      };
    }
  }, [routes]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const applySelection = () => {
      if (searchedLocation) {
        selectHex(searchedLocation.lat, searchedLocation.lng);
      } else {
        const source = map.getSource("h3-selected") as mapboxgl.GeoJSONSource | undefined;
        source?.setData({ type: "FeatureCollection", features: [] });
        // Stop an unfinished selection flight without moving the camera.
        map.stop();
        onHexSelectRef.current?.(null);
      }
    };

    if (map.getSource("h3-selected")) {
      applySelection();
    } else {
      // Remove stale callbacks when the address changes before the style loads.
      map.once("load", applySelection);
      return () => {
        map.off("load", applySelection);
      };
    }
  }, [searchedLocation, selectHex, clearSelectionKey]);

  if (!token) {
    return <p>Mapbox token is missing.</p>;
  }

  const routesCount = routes?.features.length ?? 0;
  const routesStatus = !selectedHexId
    ? null
    : routesQuery.isFetching
      ? "Loading routes…"
      : routesQuery.isError
        ? "Couldn't load routes"
        : routesCount === 0
          ? "No routes with a stop in this hexagon"
          : `Routes in this hexagon: ${routesCount}`;

  return (
    <div className="relative h-125 w-full">
      <div
        ref={mapContainer}
        className="h-full w-full overflow-hidden rounded-2xl"
      />
      {routesStatus && (
        <div
          role="status"
          className="absolute left-3 top-3 flex items-center gap-3 rounded-lg bg-white/90 px-3 py-2 text-sm shadow"
        >
          <span>{routesStatus}</span>
          {routesQuery.isError && !routesQuery.isFetching && (
            <button
              type="button"
              className="rounded border px-2 py-0.5"
              onClick={() => routesQuery.refetch()}
            >
              Retry
            </button>
          )}
        </div>
      )}
    </div>
  );
}
