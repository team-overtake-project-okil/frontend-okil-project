import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { cellToBoundary, polygonToCells, cellToLatLng } from "h3-js";
import { comparisonColors, comparisonLabels } from "../lib/hexagonAssessment";
import { comfortPalette } from "../lib/palette";
import cityBoundary from "../data/lviv-city.json";
import type { Hexagon } from "./map";
import { H3_RES, coordsToH3 } from "../lib/h3";
import { useRoutesByHex } from "../lib/useRoutesByHex";
import { groupStopRoutes } from "../lib/stopRoutes";
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
const STOP_COLOR = "#111111";
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

function stopPinImage(): ImageData {
  const pixelRatio = 2;
  const size = 44;
  const canvas = document.createElement("canvas");
  canvas.width = size * pixelRatio;
  canvas.height = size * pixelRatio;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Stop pin canvas is unavailable.");
  ctx.scale(pixelRatio, pixelRatio);

  const cx = 22;
  const cy = 20;

  ctx.beginPath();
  ctx.ellipse(cx, 40, 7, 2, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, 16, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.lineWidth = 2.25;
  ctx.strokeStyle = STOP_COLOR;
  ctx.stroke();

  const busX = cx - 11;
  const busY = cy - 5.2;
  ctx.fillStyle = STOP_COLOR;
  ctx.beginPath();
  ctx.roundRect(busX, busY, 22, 10, 2.6);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(busX + 1.6, busY + 1.6, 4.6, 3.4, 0.9);
  ctx.roundRect(busX + 7.4, busY + 1.6, 4.2, 3.4, 0.9);
  ctx.roundRect(busX + 12.8, busY + 1.6, 4.2, 3.4, 0.9);
  ctx.fill();

  ctx.fillStyle = STOP_COLOR;
  ctx.beginPath();
  ctx.arc(busX + 5.2, busY + 10, 1.85, 0, Math.PI * 2);
  ctx.arc(busX + 16.6, busY + 10, 1.85, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(busX + 5.2, busY + 10, 0.7, 0, Math.PI * 2);
  ctx.arc(busX + 16.6, busY + 10, 0.7, 0, Math.PI * 2);
  ctx.fill();

  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

function stopPopupNode(properties: HexStopProperties) {
  const root = document.createElement("div");
  root.className = "stop-popup-card";

  const head = document.createElement("div");
  head.className = "stop-popup-head";

  const title = document.createElement("div");
  title.className = "stop-popup-title";
  title.textContent = properties.name?.trim() || "Зупинка";

  const close = document.createElement("button");
  close.type = "button";
  close.className = "stop-popup-close";
  close.setAttribute("aria-label", "Закрити");
  close.textContent = "✕";
  head.append(title, close);
  root.append(head);

  const groups = groupStopRoutes(properties.routes);
  if (groups.length === 0) return root;

  const showLabels = groups.length > 1 || groups[0].kind !== "other";
  const routes = document.createElement("div");
  routes.className = "stop-popup-routes";
  for (const group of groups) {
    if (showLabels) {
      const label = document.createElement("div");
      label.className = "stop-popup-kind";
      const name = document.createElement("span");
      name.textContent = group.label;
      const count = document.createElement("span");
      count.textContent = String(group.plates.length);
      label.append(name, count);
      routes.append(label);
    }
    for (const plate of group.plates) {
      const chip = document.createElement("span");
      chip.className =
        group.kind === "other"
          ? "stop-popup-route"
          : `stop-popup-route is-${group.kind}`;
      chip.textContent = plate;
      routes.append(chip);
    }
  }
  root.append(routes);
  return root;
}

function stopNameTagNode(name: string | null) {
  const label = document.createElement("div");
  label.className = "stop-nametag-label";
  label.textContent = name?.trim() || "Зупинка";
  return label;
}

type StopHit = {
  properties?: { id?: number | string } | null;
  geometry: { type: string; coordinates?: number[] };
};

function pointCoordinates(
  geometry: StopHit["geometry"],
): [number, number] | null {
  if (geometry.type !== "Point" || !geometry.coordinates) return null;
  const [lng, lat] = geometry.coordinates;
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  return [lng, lat];
}

interface MapboxMapProps {
  hexagons: Hexagon[];
  comparisonIds: readonly string[];
  searchedLocation?: { lat: number; lng: number } | null;
  onHexSelect?: (hexId: string | null) => void;
  clearSelectionKey?: number;
  routesEnabled?: boolean;
  // Returns true when the open priorities panel takes the stop, so the map
  // card stays closed and the route list replaces the sliders.
  onStopInPanel?: (stop: HexStopProperties) => boolean;
  onStopPanelDismiss?: () => void;
}

export function MapboxMap({
  hexagons,
  comparisonIds,
  searchedLocation,
  onHexSelect,
  clearSelectionKey,
  routesEnabled = true,
  onStopInPanel,
  onStopPanelDismiss,
}: MapboxMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const onHexSelectRef = useRef(onHexSelect);
  const onStopInPanelRef = useRef(onStopInPanel);
  const onStopPanelDismissRef = useRef(onStopPanelDismiss);
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
  const stopNameTagRef = useRef<mapboxgl.Popup | null>(null);

  // Keep the latest callback without recreating the Mapbox map.
  // It also remembers the selected hexagon (null when the selection is cleared)
  // so that the routes of this hexagon can be loaded.
  useEffect(() => {
    onHexSelectRef.current = (hexId) => {
      setSelectedHexId(hexId);
      onHexSelect?.(hexId);
    };
  }, [onHexSelect]);

  useEffect(() => {
    onStopInPanelRef.current = onStopInPanel;
    onStopPanelDismissRef.current = onStopPanelDismiss;
  }, [onStopInPanel, onStopPanelDismiss]);

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
      style: "mapbox://styles/mapbox/light-v11",
      customAttribution: [
        '<a href="https://api.visicom.ua/" target="_blank" rel="noopener noreferrer">© Visicom</a>',
        'Powered by <a href="https://www.geoapify.com/" target="_blank" rel="noopener noreferrer">Geoapify</a>',
      ],
      projection: "mercator",
      center: [LVIV_LNG, LVIV_LAT],
      zoom: 12,
      minZoom: 7,
      bearing: GRID_BEARING,
      // Preserve the small grid rotation when zoom gestures finish.
      bearingSnap: 0,
      pitch: 0,
      maxPitch: 0,
      dragRotate: false,
      touchPitch: false,
    });

    mapRef.current = map;
    const overviewPadding = { top: 76, bottom: 44, left: 40, right: 40 };
    const limitOverview = () => {
      const camera = map.cameraForBounds(cityBounds, {
        padding: overviewPadding,
        bearing: GRID_BEARING,
      });
      if (camera?.zoom !== undefined) map.setMinZoom(camera.zoom);
    };
    const resize = new ResizeObserver(() => {
      map.resize();
      limitOverview();
    });
    resize.observe(mapContainer.current);

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
      "bottom-right",
    );

    map.on("click", (e) => {
      if (map.getLayer("stops-pin")) {
        const hits = map.queryRenderedFeatures(
          [
            [e.point.x - 8, e.point.y - 8],
            [e.point.x + 8, e.point.y + 8],
          ],
          { layers: ["stops-pin"] },
        ) as unknown as StopHit[];
        const hit = hits.find((feature) => feature.geometry.type === "Point");
        const stopId = Number(hit?.properties?.id);
        const stop = stopsByIdRef.current.get(stopId);
        const coordinates = hit ? pointCoordinates(hit.geometry) : null;
        if (hit && stop && coordinates) {
          stopNameTagRef.current?.remove();
          stopNameTagRef.current = null;
          if (onStopInPanelRef.current?.(stop)) {
            stopPopupRef.current?.remove();
            return;
          }
          stopPopupRef.current?.remove();
          const canvasRect = map.getCanvas().getBoundingClientRect();
          const obstacles = [
            ...document.querySelectorAll(
              ".map-toolbar, .assessment-card, .map-legend, .route-status",
            ),
          ].flatMap((el) => {
            const style = getComputedStyle(el);
            if (
              style.display === "none" ||
              style.visibility === "hidden" ||
              Number(style.opacity) === 0
            ) {
              return [];
            }
            const rect = el.getBoundingClientRect();
            return rect.width < 8 || rect.height < 8 ? [] : [rect];
          });
          const placements = [
            { anchor: "top-right" as const, offset: [10, 12] as [number, number] },
            { anchor: "top-left" as const, offset: [10, 12] as [number, number] },
            { anchor: "bottom-right" as const, offset: [10, -12] as [number, number] },
            { anchor: "bottom-left" as const, offset: [10, -12] as [number, number] },
            { anchor: "right" as const, offset: [-12, 0] as [number, number] },
            { anchor: "left" as const, offset: [12, 0] as [number, number] },
          ];
          const overlapArea = (popupEl: HTMLElement) => {
            const rect = popupEl.getBoundingClientRect();
            let area = 0;
            area += Math.max(0, canvasRect.left + 6 - rect.left) * rect.height;
            area += Math.max(0, rect.right - (canvasRect.right - 6)) * rect.height;
            area += Math.max(0, canvasRect.top + 6 - rect.top) * rect.width;
            area += Math.max(0, rect.bottom - (canvasRect.bottom - 6)) * rect.width;
            for (const obstacle of obstacles) {
              const width =
                Math.min(rect.right, obstacle.right) - Math.max(rect.left, obstacle.left);
              const height =
                Math.min(rect.bottom, obstacle.bottom) - Math.max(rect.top, obstacle.top);
              if (width > 0 && height > 0) area += width * height;
            }
            return area;
          };
          let best = placements[0];
          let bestArea = Number.POSITIVE_INFINITY;
          for (const placement of placements) {
            const trial = new mapboxgl.Popup({
              className: "stop-popup",
              closeButton: false,
              closeOnClick: false,
              anchor: placement.anchor,
              offset: placement.offset,
              maxWidth: "228px",
            })
              .setLngLat(coordinates)
              .setDOMContent(stopPopupNode(stop))
              .addTo(map);
            const trialEl = trial.getElement();
            const area = trialEl ? overlapArea(trialEl) : Number.POSITIVE_INFINITY;
            trial.remove();
            if (area < bestArea) {
              best = placement;
              bestArea = area;
            }
            if (area === 0) break;
          }
          const content = stopPopupNode(stop);
          const popup = new mapboxgl.Popup({
            className: "stop-popup",
            closeButton: false,
            closeOnClick: false,
            anchor: best.anchor,
            offset: best.offset,
            maxWidth: "228px",
          })
            .setLngLat(coordinates)
            .setDOMContent(content)
            .addTo(map);
          content
            .querySelector(".stop-popup-close")
            ?.addEventListener("click", () => popup.remove());
          stopPopupRef.current = popup;
          popup.on("close", () => {
            if (stopPopupRef.current !== popup) return;
            stopPopupRef.current = null;
          });
          return;
        }
      }

      stopPopupRef.current?.remove();
      onStopPanelDismissRef.current?.();
      selectHex(e.lngLat.lat, e.lngLat.lng);
    });

    map.on("load", () => {
      const hexes = lvivHexes([]);
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
        padding: overviewPadding,
        duration: 0,
        retainPadding: false,
        bearing: GRID_BEARING,
      });

      limitOverview();
      // Keep roads and labels above the assessment overlay, so the pastel
      // cells never wash out street names or the road network.
      const baseLayers = map.getStyle().layers;
      const roadAnchor =
        baseLayers.find(
          (layer) =>
            layer.type === "line" && /road|bridge|tunnel/.test(layer.id),
        )?.id ?? baseLayers.find((layer) => layer.type === "symbol")?.id;
      for (const layer of baseLayers) {
        if (layer.type === "symbol" && /road|street/.test(layer.id)) {
          map.setPaintProperty(layer.id, "text-color", "#515b56");
          map.setPaintProperty(layer.id, "text-halo-color", "#ffffff");
          map.setPaintProperty(layer.id, "text-halo-width", 1.3);
        }
      }
      map.addLayer(
        {
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
                comfortPalette[0],
                25,
                comfortPalette[1],
                50,
                comfortPalette[2],
                75,
                comfortPalette[3],
                100,
                comfortPalette[4],
              ],
              "#D1D1D6",
            ],
            //є score - опасіті 0.5, немає - 0.28
            "fill-opacity": ["case", ["has", "score"], 0.48, 0.14],
          },
        },
        roadAnchor,
      );

      map.addLayer(
        {
          id: "h3-hexes-line",
          type: "line",
          source: "h3-hexes",
          paint: {
            "line-color": "#8e9690",
            "line-width": 0.6,
            "line-opacity": 0.35,
          },
        },
        roadAnchor,
      );

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
          "line-color": "#405c4a",
          "line-width": 6,
          "line-blur": 1.5,
          "line-opacity": 0.28,
        },
      });

      map.addLayer({
        id: "h3-hexes-selected",
        type: "line",
        source: "h3-selected",
        paint: {
          "line-color": "#405c4a",
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
          "line-color": "#718679",
          "line-opacity": 0.85,
          "line-width": ["interpolate", ["linear"], ["zoom"], 10, 1.5, 16, 4],
        },
      });
      // Selection stays legible even where transit lines cross its boundary.
      map.moveLayer("h3-selected-glow");
      map.moveLayer("h3-hexes-selected");

      map.addSource("h3-comparison", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "h3-comparison-glow",
        type: "line",
        source: "h3-comparison",
        layout: { "line-join": "round" },
        paint: {
          "line-color": ["get", "color"],
          "line-width": 16,
          "line-blur": 6,
          "line-opacity": 0.72,
        },
      });
      map.addLayer({
        id: "h3-comparison-outline",
        type: "line",
        source: "h3-comparison",
        layout: { "line-join": "round" },
        paint: {
          "line-color": ["get", "color"],
          "line-width": 4,
        },
      });

      // Stops inside the selected hexagon. The request also returns the rest of each route.
      map.addSource("stops", {
        type: "geojson",
        data: emptyStopsGeoJSON(),
      });

      map.addImage("stop-pin", stopPinImage(), { pixelRatio: 2 });

      map.addLayer({
        id: "stops-pin",
        type: "symbol",
        source: "stops",
        layout: {
          "icon-image": "stop-pin",
          "icon-anchor": "center",
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
          "icon-size": [
            "interpolate",
            ["exponential", 1.5],
            ["zoom"],
            10, 0.16,
            12, 0.24,
            13.5, 0.4,
            16, 0.68,
            18, 0.9,
          ],
        },
      });

      let hoveredStopId: number | null = null;
      const hideNameTag = () => {
        stopNameTagRef.current?.remove();
        stopNameTagRef.current = null;
        hoveredStopId = null;
      };

      map.on("mousemove", "stops-pin", (event) => {
        canvas.style.cursor = "pointer";
        if (stopPopupRef.current) return;
        const feature = event.features?.[0] as unknown as StopHit | undefined;
        const stopId = Number(feature?.properties?.id);
        const stop = stopsByIdRef.current.get(stopId);
        const coordinates = feature ? pointCoordinates(feature.geometry) : null;
        if (!feature || !stop || !coordinates || hoveredStopId === stopId) return;
        hideNameTag();
        hoveredStopId = stopId;
        const nameTag = new mapboxgl.Popup({
          className: "stop-nametag",
          closeButton: false,
          closeOnClick: false,
          anchor: "bottom",
          offset: [0, -14],
          maxWidth: "180px",
        })
          .setLngLat(coordinates)
          .setDOMContent(stopNameTagNode(stop.name))
          .addTo(map);
        stopNameTagRef.current = nameTag;
      });
      map.on("mouseleave", "stops-pin", () => {
        canvas.style.cursor = "default";
        hideNameTag();
      });
    });
    return () => {
      window.removeEventListener("mouseup", onMouseUp);
      resize.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [selectHex]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const apply = () => {
      const source = map.getSource<mapboxgl.GeoJSONSource>("h3-comparison");
      source?.setData({
        type: "FeatureCollection",
        features: comparisonIds.map((id, index) => ({
          type: "Feature",
          properties: { color: comparisonColors[index] },
          geometry: {
            type: "Polygon",
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

    if (map.getSource("h3-comparison")) {
      apply();
    } else {
      map.once("load", apply);
    }

    return () => {
      map.off("load", apply);
      labels.forEach((label) => label.remove());
    };
  }, [comparisonIds, selectHex]);

  // Push the routes of the selected hexagon into the map (empty when nothing is selected).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const data = (routesEnabled ? routes : undefined) ?? {
      type: "FeatureCollection" as const,
      features: [],
    };
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
  }, [routes, routesEnabled]);

  useEffect(() => {
    const next = new Map<number, HexStopProperties>();
    for (const feature of stops.features) {
      next.set(feature.properties.id, feature.properties);
    }
    stopsByIdRef.current = next;
  }, [stops]);

  useEffect(() => {
    stopPopupRef.current?.remove();
    stopPopupRef.current = null;
    stopNameTagRef.current?.remove();
    stopNameTagRef.current = null;
    onStopPanelDismissRef.current?.();
  }, [selectedHexId, routesEnabled]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const data = stops;
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
      const hexes = lvivHexes(hexagons);
      source?.setData(hexes);
      hexScoresRef.current = new Map(
        hexes.features.map((feature) => [
          feature.properties.id,
          "score" in feature.properties ? feature.properties.score : undefined,
        ]),
      );
    };

    if (map.getSource("h3-hexes")) apply();
    else {
      map.once("load", apply);
      return () => {
        map.off("load", apply);
      };
    }
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
    return (
      <div className="text-block map-message" role="alert">
        Карта тимчасово недоступна: не налаштовано доступ до картографічного
        сервісу.
      </div>
    );
  }

  const routesCount = routes?.features.length ?? 0;
  const routesStatus =
    !routesEnabled || !selectedHexId
      ? null
      : routesQuery.isFetching
        ? "Завантажуємо маршрути…"
        : routesQuery.isError
          ? "Не вдалося завантажити маршрути"
          : routesCount === 0
            ? "У цій ділянці немає зупинок маршрутів"
            : `Маршрутів із зупинкою тут: ${routesCount}`;

  return (
    <div className="mapbox-frame">
      <div
        ref={mapContainer}
        className="h-full w-full overflow-hidden rounded-2xl"
      />
      {routesStatus && (
        <div
          role="status"
          className="route-status absolute top-3 left-3 flex items-center gap-3 rounded-lg bg-white/90 px-3 py-2 text-sm shadow"
        >
          <div className="inline-text">{routesStatus}</div>
          {routesQuery.isError && !routesQuery.isFetching && (
            <button
              type="button"
              className="rounded border px-2 py-0.5"
              onClick={() => routesQuery.refetch()}
            >
              Повторити
            </button>
          )}
          {stopsQuery.isError && !stopsQuery.isFetching && (
            <button
              type="button"
              className="rounded border px-2 py-0.5"
              onClick={() => stopsQuery.refetch()}
            >
              Повторити зупинки
            </button>
          )}
        </div>
      )}
    </div>
  );
}
