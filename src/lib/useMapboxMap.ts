// Полотно Mapbox: камера Львова, оцінки ділянок, маршрути і порівняння
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { cellToBoundary, cellToLatLng } from "h3-js";
import { coordsToH3 } from "./h3";
import { useRoutesByHex } from "./useRoutesByHex";
import {
  stopsInsideHex,
  useStopsByHex,
  type HexStopProperties,
} from "./useStopsByHex";
import type { Hexagon } from "./hexagonRating";
import { handleMapClick } from "../components/mapbox/mapClick";
import { installCityLayers } from "../components/mapbox/mapLayers";
import { mountComparison } from "../components/mapbox/syncComparison";
import { whenMapSourceReady } from "../components/mapbox/whenMapSourceReady";
import {
  cityBounds,
  GRID_BEARING,
  hexScoreIndex,
  LVIV_LAT,
  LVIV_LNG,
  lvivHexes,
  SELECTION_ZOOM,
} from "../components/mapbox/lvivGrid";

export const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;

const overviewPadding = { top: 76, bottom: 44, left: 40, right: 40 };

interface UseMapboxMapArgs {
  hexagons: Hexagon[];
  comparisonIds: readonly string[];
  searchedLocation?: { lat: number; lng: number } | null;
  onHexSelect?: (hexId: string | null) => void;
  clearSelectionKey?: number;
  routesEnabled: boolean;
  onStopInPanel?: (stop: HexStopProperties) => boolean;
  onStopPanelDismiss?: () => void;
}

export function useMapboxMap({
  hexagons,
  comparisonIds,
  searchedLocation,
  onHexSelect,
  clearSelectionKey,
  routesEnabled,
  onStopInPanel,
  onStopPanelDismiss,
}: UseMapboxMapArgs) {
  const containerRef = useRef<HTMLDivElement>(null);
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
    const map = mapRef.current;
    if (!map) return;

    return whenMapSourceReady(map, "h3-hexes", () => {
      const source = map.getSource("h3-hexes") as
        mapboxgl.GeoJSONSource | undefined;
      const hexes = lvivHexes(hexagons);
      source?.setData(hexes);
      hexScoresRef.current = hexScoreIndex(hexes);
    });
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
    selectedHexId,
    routesCount: routes?.features.length ?? 0,
    routesFetching: routesQuery.isFetching,
    routesError: routesQuery.isError,
    stopsFetching: stopsQuery.isFetching,
    stopsError: stopsQuery.isError,
    retryRoutes: () => routesQuery.refetch(),
    retryStops: () => stopsQuery.refetch(),
  };
}
