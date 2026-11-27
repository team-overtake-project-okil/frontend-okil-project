// Полотно Mapbox: камера Львова, оцінки ділянок, маршрути і порівняння
import { useCallback, useEffect, useMemo, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { cellToBoundary, cellToLatLng, isValidCell } from "h3-js";
import { coordsToH3 } from "../../lib/h3";
import { useRoutesByHex } from "../../lib/useRoutesByHex";
import {
  stopsInsideHex,
  useStopsByHex,
  type HexStopProperties,
} from "../../lib/useStopsByHex";
import type { Hexagon } from "../../lib/hexagonRating";
import { handleMapClick } from "./mapClick";
import { installCityLayers } from "./mapLayers";
import { comparisonLabelAppearance, mountComparison } from "./syncComparison";
import { clipRoutesAroundOrigin } from "./clipRoutesAroundOrigin";
import { mountMobilityAnchors } from "./syncMobilityAnchors";
import { whenMapSourceReady } from "./whenMapSourceReady";
import {
  cityBounds,
  GRID_BEARING,
  hexScoreIndex,
  LVIV_LAT,
  LVIV_LNG,
  lvivHexes,
  SELECTION_ZOOM,
} from "./lvivGrid";
import type { MobilityAnchorMarker } from "../../lib/mobilityAnchors";
import type { HexagonRoutes } from "../../lib/hexagonAssessment";
import { isInLviv } from "../../services/lvivBoundary";

export const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;

const overviewPadding = { top: 76, bottom: 44, left: 40, right: 40 };

interface UseMapboxMapArgs {
  hexagons: Hexagon[];
  comparisonIds: readonly string[];
  comparisonRouteOriginId?: string | null;
  onAddToComparison?: () => void;
  comparisonActionLabel?: string;
  searchedLocation?: { lat: number; lng: number } | null;
  selectedHexId: string | null;
  onHexSelect?: (hexId: string | null) => void;
  clearSelectionKey?: number;
  routesEnabled: boolean;
  assessmentRoutes: HexagonRoutes | null;
  anchorPoints?: readonly MobilityAnchorMarker[];
  onAnchorPick?: ((location: { lat: number; lng: number }) => void) | null;
  onStopInPanel?: (stop: HexStopProperties) => boolean;
  onStopPanelDismiss?: () => void;
}

export function useMapboxMap({
  hexagons,
  comparisonIds,
  comparisonRouteOriginId,
  onAddToComparison,
  comparisonActionLabel,
  searchedLocation,
  selectedHexId,
  onHexSelect,
  clearSelectionKey,
  routesEnabled,
  assessmentRoutes,
  anchorPoints,
  onAnchorPick,
  onStopInPanel,
  onStopPanelDismiss,
}: UseMapboxMapArgs) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const onHexSelectRef = useRef(onHexSelect);
  const anchorPickRef = useRef(onAnchorPick);
  useEffect(() => {
    anchorPickRef.current = onAnchorPick;
  }, [onAnchorPick]);
  const onStopInPanelRef = useRef(onStopInPanel);
  const onStopPanelDismissRef = useRef(onStopPanelDismiss);
  const hexScoresRef = useRef(new Map<string, number | undefined>());
  const hexesRef = useRef<ReturnType<typeof lvivHexes> | null>(null);

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
  // The workspace owns the selected hexagon and passes it back for routes.
  useEffect(() => {
    onHexSelectRef.current = onHexSelect;
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
    if (!containerRef.current || !mapboxToken || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      accessToken: mapboxToken,
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
    resize.observe(containerRef.current);

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

    map.on("click", (event) => {
      if (anchorPickRef.current) {
        const { lat, lng } = event.lngLat;
        if (isInLviv(lng, lat)) anchorPickRef.current({ lat, lng });
        return;
      }
      handleMapClick(map, event, {
        stopsByIdRef,
        stopPopupRef,
        stopNameTagRef,
        onStopInPanelRef,
        onStopPanelDismissRef,
        selectHex,
      });
    });

    map.on("load", () => {
      installCityLayers(map, {
        hexes: hexesRef.current ?? lvivHexes([]),
        padding: overviewPadding,
        limitOverview,
        hexScoresRef,
        stopsByIdRef,
        stopPopupRef,
        stopNameTagRef,
        canvas,
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
    return mountComparison(map, comparisonIds);
  }, [comparisonIds]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !onAddToComparison || onAnchorPick ||
        !selectedHexId || !isValidCell(selectedHexId)) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "map-comparison-add assessment-ask assessment-ask-inline";
    button.setAttribute("aria-label", comparisonActionLabel ?? "Додати до порівняння");
    button.textContent = comparisonActionLabel ?? "Додати";
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      onAddToComparison();
    });

    const [lat, lng] = cellToLatLng(selectedHexId);
    const boundary = cellToBoundary(selectedHexId, true);
    const marker = new mapboxgl.Marker({ element: button, anchor: "bottom" })
      .setLngLat([lng, lat])
      .addTo(map);
    const placeAboveHexagon = () => {
      const center = map.project([lng, lat]);
      const top = Math.min(
        ...boundary.map(([lng, lat]) => map.project([lng, lat]).y),
      );
      marker.setOffset([0, top - center.y - 8]);
    };
    placeAboveHexagon();
    map.on("move", placeAboveHexagon);
    map.on("resize", placeAboveHexagon);
    return () => {
      map.off("move", placeAboveHexagon);
      map.off("resize", placeAboveHexagon);
      marker.remove();
    };
  }, [selectedHexId, onAddToComparison, comparisonActionLabel, onAnchorPick]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    return mountMobilityAnchors(map, anchorPoints ?? []);
  }, [anchorPoints]);

  // Push the routes of the selected hexagon into the map (empty when nothing is selected).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const data = (routesEnabled ? routes : undefined) ?? {
      type: "FeatureCollection" as const,
      features: [],
    };
    return whenMapSourceReady(map, "routes", () => {
      const source = map.getSource("routes") as
        mapboxgl.GeoJSONSource | undefined;
      source?.setData(data);
    });
  }, [routes, routesEnabled]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const data = assessmentRoutes ?? {
      type: "FeatureCollection" as const,
      features: [],
    };
    let frame: number | undefined;
    let previousRadius: number | undefined;
    const updateRoutes = () => {
      frame = undefined;
      const source = map.getSource<mapboxgl.GeoJSONSource>("assessment-routes");
      if (!source) return;

      const { size, visibility } = comparisonLabelAppearance(map.getZoom());
      const radius = comparisonRouteOriginId ? (size * 17 * visibility) / 18 : 0;
      if (!radius && previousRadius === 0) return;

      source.setData(
        comparisonRouteOriginId && radius > 0
          ? clipRoutesAroundOrigin(map, data, comparisonRouteOriginId, radius)
          : data,
      );
      previousRadius = radius;
    };
    const scheduleRouteUpdate = () => {
      if (frame === undefined) frame = requestAnimationFrame(updateRoutes);
    };
    const cancel = whenMapSourceReady(map, "assessment-routes", updateRoutes);

    if (comparisonRouteOriginId) map.on("zoom", scheduleRouteUpdate);
    return () => {
      cancel?.();
      if (frame !== undefined) cancelAnimationFrame(frame);
      if (comparisonRouteOriginId) map.off("zoom", scheduleRouteUpdate);
    };
  }, [assessmentRoutes, comparisonRouteOriginId]);

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

    return whenMapSourceReady(map, "stops", () => {
      const source = map.getSource("stops") as
        mapboxgl.GeoJSONSource | undefined;
      source?.setData(stops);
    });
  }, [stops]);

  useEffect(() => {
    const hexes = lvivHexes(hexagons);
    hexesRef.current = hexes;
    const map = mapRef.current;
    if (!map) return;

    const source = map.getSource("h3-hexes") as
      mapboxgl.GeoJSONSource | undefined;
    if (source) {
      source.setData(hexes);
      hexScoresRef.current = hexScoreIndex(hexes);
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

  return {
    refs: { containerRef },
    routesCount: routes?.features.length ?? 0,
    routesFetching: routesQuery.isFetching,
    routesError: routesQuery.isError,
    stopsFetching: stopsQuery.isFetching,
    stopsError: stopsQuery.isError,
    retryRoutes: () => routesQuery.refetch(),
    retryStops: () => stopsQuery.refetch(),
  };
}
