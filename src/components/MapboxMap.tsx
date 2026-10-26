import { useCallback, useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { cellToBoundary, polygonToCells, cellToLatLng } from "h3-js";
import cityBoundary from "../data/lviv-city.json";
import type { Hexagon } from "./map";
import { H3_RES, coordsToH3 } from "../lib/h3";

const token = import.meta.env.VITE_MAPBOX_TOKEN;

const LVIV_LAT = 49.8429;
const LVIV_LNG = 24.0316;
const SELECTION_ZOOM = 13.5;
// const SCORE_COLOR: mapboxgl.ExpressionSpecification = [
//   "interpolate",
//   ["linear"],
//   ["get", "score"],
//   0,
//   "#FF3B30",
//   50,
//   "#FFCC00",
//   100,
//   "#34C759",
// ];

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
const GRID_BEARING =
  (Math.atan2(
    vertexPoint.x - referencePoint.x,
    referencePoint.y - vertexPoint.y,
  ) *
    180) /
  Math.PI;

const cityBounds = new mapboxgl.LngLatBounds();
for (const [lng, lat] of cityBoundary.coordinates[0]) {
  cityBounds.extend([lng, lat]);
}
// Convert the 5 km margin to degrees at Lviv's latitude.
const latitudeMargin = 5 / 111.32;
const longitudeMargin = latitudeMargin / Math.cos((LVIV_LAT * Math.PI) / 180);
const navigationBounds: [[number, number], [number, number]] = [
  [
    cityBounds.getWest() - longitudeMargin,
    cityBounds.getSouth() - latitudeMargin,
  ],
  [
    cityBounds.getEast() + longitudeMargin,
    cityBounds.getNorth() + latitudeMargin,
  ],
];

// Administrative boundary of the city of Lviv (OSM relation 2032280).
const lvivCellIds = polygonToCells(cityBoundary.coordinates, H3_RES, true);

function overallScore(hex: Hexagon) {
  const values = [
    hex.health,
    hex.study,
    hex.daily,
    hex.mobility,
    hex.sport,
    hex.enjoyment,
    hex.food,
    hex.security,
  ];
  return Math.round(
    values.reduce((sum, value) => sum + value, 0) / values.length,
  );
}

function lvivHexes(hexagons: Hexagon[]) {
  const scoreById = new Map(
    hexagons.map((hex) => [hex.h3_id, overallScore(hex)] as const),
  );
  const ids = new Set<string>(lvivCellIds);
  for (const hex of hexagons) ids.add(hex.h3_id);

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

interface MapboxMapProps {
  hexagons: Hexagon[];
  searchedLocation?: { lat: number; lng: number } | null;
  onHexSelect?: (hexId: string | null) => void;
  clearSelectionKey?: number;
}

export function MapboxMap({
  hexagons,
  searchedLocation,
  onHexSelect,
  clearSelectionKey,
}: MapboxMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const onHexSelectRef = useRef(onHexSelect);
  const hexScoresRef = useRef(new Map<string, number | undefined>());

  // Keep the latest callback without recreating the Mapbox map.
  useEffect(() => {
    onHexSelectRef.current = onHexSelect;
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

    map.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      "top-right",
    );

    map.on("click", (e) => {
      selectHex(e.lngLat.lat, e.lngLat.lng);
    });

    map.on("load", () => {
      const hexes = lvivHexes(hexagons);
      hexScoresRef.current = new Map(
        hexes.features.map((feature) => [
          feature.properties.id,
          "score" in feature.properties ? feature.properties.score : undefined,
        ]),
      );

      map.addSource("h3-hexes", {
        type: "geojson",
        data: hexes,
      });

      map.fitBounds(cityBounds, {
        padding: 24,
        duration: 0,
        retainPadding: false,
        bearing: GRID_BEARING,
      });

      map.addLayer({
        id: "h3-hexes-fill",
        type: "fill",
        source: "h3-hexes",
        paint: {
          "fill-color": [
            "case",
            ["has", "score"],
            [
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
            "#D1D1D6",
          ],
          //є score - опасіті 0.5, немає - 0.28
          "fill-opacity": ["case", ["has", "score"], 0.5, 0.28],
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
    });

    return () => {
      window.removeEventListener("mouseup", onMouseUp);
      map.remove();
      mapRef.current = null;
    };
  }, [selectHex]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const apply = () => {
      const source = map.getSource("h3-hexes") as
        mapboxgl.GeoJSONSource | undefined;
      source?.setData(lvivHexes(hexagons));
    };

    if (map.getSource("h3-hexes")) apply();
    else map.once("load", apply);
  }, [hexagons]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !searchedLocation) return;

    const { lng, lat } = searchedLocation;

    map.flyTo({
      center: [lng, lat],
      zoom: 15,
      essential: true,
    });

    const applySelection = () => {
      if (searchedLocation) {
        selectHex(searchedLocation.lat, searchedLocation.lng);
      } else {
        const source = map.getSource("h3-selected") as
          mapboxgl.GeoJSONSource | undefined;
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

  return (
    <div
      ref={mapContainer}
      className="h-125 w-full overflow-hidden rounded-2xl"
    />
  );
}
