import type { Hexagon } from "./map/hexagonRating";
import { RouteStatus } from "./mapbox/RouteStatus";
import { mapboxToken, useMapboxMap } from "./mapbox/useMapboxMap";
import type { HexStopProperties } from "../lib/useStopsByHex";

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
  const map = useMapboxMap({
    hexagons,
    comparisonIds,
    searchedLocation,
    onHexSelect,
    clearSelectionKey,
    routesEnabled,
    onStopInPanel,
    onStopPanelDismiss,
  });
  const { containerRef } = map.refs;

  if (!mapboxToken) {
    return (
      <div className="text-block map-message" role="alert">
        Карта тимчасово недоступна: не налаштовано доступ до картографічного
        сервісу.
      </div>
    );
  }

  return (
    <div className="mapbox-frame">
      <div
        ref={containerRef}
        className="h-full w-full overflow-hidden rounded-2xl"
      />
      <RouteStatus
        routesEnabled={routesEnabled}
        selectedHexId={map.selectedHexId}
        routesCount={map.routesCount}
        routesFetching={map.routesFetching}
        routesError={map.routesError}
        stopsFetching={map.stopsFetching}
        stopsError={map.stopsError}
        onRetryRoutes={map.retryRoutes}
        onRetryStops={map.retryStops}
      />
    </div>
  );
}
