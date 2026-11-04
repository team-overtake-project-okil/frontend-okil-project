import { useQuery } from "@tanstack/react-query";
import { fetcher } from "./fetcher";

export interface HexStopRoute {
  id: number;
  number: string;
  direction: string | null;
}

export interface HexStopProperties {
  id: number;
  name: string | null;
  in_hex: boolean;
  routes: HexStopRoute[];
}

export interface HexStopFeature {
  type: "Feature";
  properties: HexStopProperties;
  geometry: { type: "Point"; coordinates: [number, number] };
}

export interface HexStopsGeoJSON {
  type: "FeatureCollection";
  features: HexStopFeature[];
}

const emptyStops: HexStopsGeoJSON = { type: "FeatureCollection", features: [] };

export function emptyStopsGeoJSON(): HexStopsGeoJSON {
  return emptyStops;
}

// "Підвальна (59)" and "Ветеранів (727-1)" keep a catalogue code in parentheses.
function stopDisplayName(name: string | null): string | null {
  if (name == null) return null;
  const stripped = name.replace(/\s*\(\d+(?:-\d+)*\)\s*$/, "").trim();
  return stripped || null;
}

// The map draws only the stops that sit inside the selected hexagon.
export function stopsInsideHex(
  collection: HexStopsGeoJSON | undefined,
): HexStopsGeoJSON {
  if (!collection) return emptyStops;
  return {
    type: "FeatureCollection",
    features: collection.features.flatMap((feature) => {
      if (!feature.properties.in_hex) return [];
      return [
        {
          ...feature,
          properties: {
            ...feature.properties,
            name: stopDisplayName(feature.properties.name),
          },
        },
      ];
    }),
  };
}

// Stops of the routes shown for the selected hexagon.
// The request is sent only when a hexagon is selected; every hexagon is cached separately.
export function useStopsByHex(hexId: string | null) {
  return useQuery<HexStopsGeoJSON>({
    queryKey: ["stops-by-hex", hexId],
    queryFn: () =>
      fetcher(
        `/routes/stops/geojson?h3_id=${encodeURIComponent(hexId ?? "")}`,
      ),
    enabled: !!hexId,
    staleTime: 5 * 60 * 1000,
  });
}
