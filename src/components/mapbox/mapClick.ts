// Клік по карті: картка зупинки або вибір ділянки
import type { RefObject } from "react";
import type { Map as MapboxMap, MapMouseEvent, Popup } from "mapbox-gl";
import type { HexStopProperties } from "../../lib/useStopsByHex";
import { openStopPopup, pointCoordinates, type StopHit } from "./stopPopup";

interface MapClickTargets {
  stopsByIdRef: RefObject<Map<number, HexStopProperties>>;
  stopPopupRef: RefObject<Popup | null>;
  stopNameTagRef: RefObject<Popup | null>;
  onStopInPanelRef: RefObject<
    ((stop: HexStopProperties) => boolean) | undefined
  >;
  onStopPanelDismissRef: RefObject<(() => void) | undefined>;
  selectHex: (lat: number, lng: number) => void;
}

export function handleMapClick(
  map: MapboxMap,
  event: MapMouseEvent,
  targets: MapClickTargets,
) {
  const {
    stopsByIdRef,
    stopPopupRef,
    stopNameTagRef,
    onStopInPanelRef,
    onStopPanelDismissRef,
    selectHex,
  } = targets;

  if (map.getLayer("stops-pin")) {
    const hits = map.queryRenderedFeatures(
      [
        [event.point.x - 8, event.point.y - 8],
        [event.point.x + 8, event.point.y + 8],
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
      const popup = openStopPopup(map, stop, coordinates);
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
  selectHex(event.lngLat.lat, event.lngLat.lng);
}
