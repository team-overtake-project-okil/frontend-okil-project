import { useQuery } from "@tanstack/react-query";
import { fetcher } from "./fetcher";

export interface HexRouteProperties {
  id: number;
  name: string;
  number: string;
  direction: string | null;
  // "segments" = line follows the roads (shape), "stops" = straight lines between stops
  geometry_source: "segments" | "stops";
}

export interface HexRouteFeature {
  type: "Feature";
  properties: HexRouteProperties;
  geometry: { type: "LineString"; coordinates: [number, number][] };
}

export interface HexRoutesGeoJSON {
  type: "FeatureCollection";
  features: HexRouteFeature[];
}

// Routes that have a stop inside the selected H3 hexagon.
// The request is sent only when a hexagon is selected; every hexagon is cached separately.
export function useRoutesByHex(hexId: string | null) {
  return useQuery<HexRoutesGeoJSON>({
    queryKey: ["routes-by-hex", hexId],
    queryFn: () =>
      fetcher(`/routes/geojson?h3_id=${encodeURIComponent(hexId ?? "")}`),
    enabled: !!hexId,
    staleTime: 5 * 60 * 1000,
  });
}
