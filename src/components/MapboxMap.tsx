import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { cellToBoundary, polygonToCells, cellToLatLng } from "h3-js";
import cityBoundary from "../data/lviv-city.json";
import type { Hexagon } from "./map";
import { H3_RES, coordsToH3 } from "../lib/h3";
import { useRoutesByHex } from "../lib/useRoutesByHex";
import {
  emptyStopsGeoJSON,
  stopsInsideHex,
  useStopsByHex,
  type HexStopProperties,
} from "../lib/useStopsByHex";

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
  return hex.overall_rating;
}

function lvivHexes(hexagons: Hexagon[]) {
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

function stopPopupNode(properties: HexStopProperties) {
  const root = document.createElement("div");
  root.className = "flex max-w-56 flex-col gap-1.5";

  const title = document.createElement("div");
  title.className = "text-sm font-medium text-black";
  title.textContent = properties.name?.trim() || "Зупинка";
  root.append(title);

  const seen = new Set<string>();
  const routes = document.createElement("div");
  routes.className = "flex flex-wrap gap-1";
  for (const route of properties.routes) {
    if (seen.has(route.number)) continue;
    seen.add(route.number);
    const chip = document.createElement("span");
    chip.className =
      "rounded-full bg-[#5B21B6]/10 px-2 py-0.5 text-[12px] leading-none font-medium text-[#5B21B6]";
    chip.textContent = route.number;
    routes.append(chip);
  }
  if (routes.childNodes.length > 0) root.append(routes);
  return root;
}

type StopHit = {
  properties?: { id?: number | string } | null;
  geometry: { type: string; coordinates?: number[] };
};

function pointCoordinates(geometry: StopHit["geometry"]): [number, number] | null {
  if (geometry.type !== "Point" || !geometry.coordinates) return null;
  const [lng, lat] = geometry.coordinates;
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  return [lng, lat];
}

interface MapboxMapProps {
  hexagons: Hexagon[];
  searchedLocation?: { lat: number; lng: number } | null;
  onHexSelect?: (hexId: string | null) => void;
  clearSelectionKey?: number;
  routesEnabled?: boolean;
}

export function MapboxMap({
  hexagons,
  searchedLocation,
  onHexSelect,
  clearSelectionKey,
  routesEnabled = true,
}: MapboxMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const onHexSelectRef = useRef(onHexSelect);
  const hexScoresRef = useRef(new Map<string, number | undefined>());
  const [selectedHexId, setSelectedHexId] = useState<string | null>(null);

  // Fetch routes only when enabled and a hexagon is selected.
  const routesQuery = useRoutesByHex(routesEnabled ? selectedHexId : null);
  const routes = routesQuery.data;
  const stopsQuery = useStopsByHex(routesEnabled ? selectedHexId : null);
  const stops = useMemo(
    () => stopsInsideHex(stopsQuery.data),
    [stopsQuery.data],
  );
  const stopsByIdRef = useRef(new Map<number, HexStopProperties>());
  const stopPopupRef = useRef<mapboxgl.Popup | null>(null);

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
      customAttribution: [
        '<a href="https://api.visicom.ua/" target="_blank" rel="noopener noreferrer">© Visicom</a>',
        'Powered by <a href="https://www.geoapify.com/" target="_blank" rel="noopener noreferrer">Geoapify</a>',
      ],
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
      if (map.getLayer("stops-circle")) {
        const hits = map.queryRenderedFeatures(
          [
            [e.point.x - 6, e.point.y - 6],
            [e.point.x + 6, e.point.y + 6],
          ],
          { layers: ["stops-circle"] },
        ) as unknown as StopHit[];
        const hit = hits.find((feature) => feature.geometry.type === "Point");
        const stopId = Number(hit?.properties?.id);
        const stop = stopsByIdRef.current.get(stopId);
        const coordinates = hit ? pointCoordinates(hit.geometry) : null;
        if (hit && stop && coordinates) {
          stopPopupRef.current?.remove();
          const popup = new mapboxgl.Popup({
            className: "stop-popup",
            closeButton: false,
            closeOnClick: false,
            offset: 8,
            maxWidth: "240px",
          })
            .setLngLat(coordinates)
            .setDOMContent(stopPopupNode(stop))
            .addTo(map);
          stopPopupRef.current = popup;
          popup.on("close", () => {
            if (stopPopupRef.current === popup) stopPopupRef.current = null;
          });
          return;
        }
      }

      stopPopupRef.current?.remove();
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

      // Only stops inside the selected hexagon. The request also returns the rest of each route.
      map.addSource("stops", {
        type: "geojson",
        data: emptyStopsGeoJSON(),
      });

      map.addLayer({
        id: "stops-circle",
        type: "circle",
        source: "stops",
        layout: {
          "circle-sort-key": ["case", ["==", ["get", "in_hex"], true], 1, 0],
        },
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            11,
            2,
            14,
            3.25,
            16,
            4.5,
          ],
          "circle-color": [
            "case",
            ["==", ["get", "in_hex"], true],
            "#007AFF",
            "#FFFFFF",
          ],
          "circle-stroke-color": [
            "case",
            ["==", ["get", "in_hex"], true],
            "#FFFFFF",
            "#5B21B6",
          ],
          "circle-stroke-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            11,
            1,
            16,
            1.5,
          ],
        },
      });

      map.addLayer({
        id: "stops-label",
        type: "symbol",
        source: "stops",
        minzoom: 14,
        layout: {
          "text-field": ["coalesce", ["get", "name"], ""],
          "text-size": 11,
          "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
          "text-offset": [0, 0.9],
          "text-anchor": "top",
          "text-max-width": 12,
          "text-optional": true,
        },
        paint: {
          "text-color": "#1C1C1E",
          "text-halo-color": "#FFFFFF",
          "text-halo-width": 1.25,
        },
      });

      map.on("mouseenter", "stops-circle", () => {
        canvas.style.cursor = "pointer";
      });
      map.on("mouseleave", "stops-circle", () => {
        canvas.style.cursor = "default";
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
      const source = map.getSource("routes") as
        mapboxgl.GeoJSONSource | undefined;
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
    const next = new Map<number, HexStopProperties>();
    for (const feature of stops?.features ?? []) {
      next.set(feature.properties.id, feature.properties);
    }
    stopsByIdRef.current = next;
  }, [stops]);

  useEffect(() => {
    stopPopupRef.current?.remove();
    stopPopupRef.current = null;
  }, [selectedHexId]);

  // Stops follow the same selection as the route lines.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const data = stops ?? emptyStopsGeoJSON();
    const apply = () => {
      const source = map.getSource("stops") as
        mapboxgl.GeoJSONSource | undefined;
      source?.setData(data);
    };

    if (map.getSource("stops")) {
      apply();
    } else {
      map.once("load", apply);
      return () => {
        map.off("load", apply);
      };
    }
  }, [stops]);

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
    if (!map) return;

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

  const routesCount = routes?.features.length ?? 0;
  const routesStatus =
    !routesEnabled || !selectedHexId
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
          className="absolute top-3 left-3 flex items-center gap-3 rounded-lg bg-white/90 px-3 py-2 text-sm shadow"
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
          {stopsQuery.isError && !stopsQuery.isFetching && (
            <button
              type="button"
              className="text-[#007AFF]"
              onClick={() => stopsQuery.refetch()}
            >
              Зупинки не завантажились
            </button>
          )}
        </div>
      )}
    </div>
  );
}
