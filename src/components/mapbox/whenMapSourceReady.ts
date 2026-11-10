// Запис у шар GeoJSON одразу або після завантаження стилю карти
import type { Map as MapboxMap } from "mapbox-gl";

export function whenMapSourceReady(
  map: MapboxMap,
  sourceId: string,
  apply: () => void,
) {
  if (map.getSource(sourceId)) {
    apply();
    return;
  }
  map.once("load", apply);
  return () => {
    map.off("load", apply);
  };
}
