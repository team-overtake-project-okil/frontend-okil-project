import type { Hexagon } from "../lib/hexagonRating";
import { RouteStatus } from "./mapbox/RouteStatus";
import { mapboxToken, useMapboxMap } from "./mapbox/useMapboxMap";
import type { HexStopProperties } from "../lib/useStopsByHex";
import type { MobilityAnchorMarker } from "../lib/mobilityAnchors";
import type { HexagonRoutes } from "../lib/hexagonAssessment";

interface MapboxMapProps {
  hexagons: Hexagon[];
  comparisonIds: readonly string[];
  searchedLocation?: { lat: number; lng: number } | null;
  selectedHexId: string | null;
  onHexSelect?: (hexId: string | null, highlight?: () => void) => boolean | void;
  clearSelectionKey?: number;
  routesEnabled?: boolean;
  assessmentRoutes: HexagonRoutes | null;
  anchorPoints?: readonly MobilityAnchorMarker[];
  onAnchorPick?: ((location: { lat: number; lng: number }) => void) | null;
  // Returns true when the open priorities panel takes the stop, so the map
  // card stays closed and the route list replaces the sliders.
  onStopInPanel?: (stop: HexStopProperties) => boolean;
  onStopPanelDismiss?: () => void;
}

export function MapboxMap({
  hexagons,
  comparisonIds,
  searchedLocation,
  selectedHexId,
  onHexSelect,
  clearSelectionKey,
  routesEnabled = true,
  onStopInPanel,
  onStopPanelDismiss,
  assessmentRoutes,
  anchorPoints,
  onAnchorPick,
}: MapboxMapProps) {
  const map = useMapboxMap({
    hexagons,
    comparisonIds,
    searchedLocation,
    selectedHexId,
    onHexSelect,
    clearSelectionKey,
    routesEnabled,
    onStopInPanel,
    onStopPanelDismiss,
    assessmentRoutes,
    anchorPoints,
    onAnchorPick,
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
        selectedHexId={selectedHexId}
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
