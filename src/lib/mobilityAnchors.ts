import { weightsSearch, type AssessmentWeights } from "./assessmentWeights";

export type MobilityAnchor = {
  id: string;
  label: string;
  lat: number;
  lng: number;
  source: "default" | "address" | "map" | "preset";
  address?: string;
};

export type MobilityAnchorMarker = MobilityAnchor & { routeColor?: string };

export const MAX_ANCHORS = 5;
export const defaultAnchors = (): MobilityAnchor[] => [];

export function validAnchors(anchors: readonly MobilityAnchor[]) {
  return (
    anchors.length >= 1 &&
    anchors.length <= MAX_ANCHORS &&
    anchors.every(
      ({ lat, lng, label }) =>
        label.trim() &&
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        Math.abs(lat) <= 90 &&
        Math.abs(lng) <= 180,
    )
  );
}

export function sameAnchors(
  a: readonly MobilityAnchor[],
  b: readonly MobilityAnchor[],
) {
  return (
    a.length === b.length &&
    a.every(
      (point, i) =>
        point.lat === b[i].lat &&
        point.lng === b[i].lng &&
        point.label === b[i].label,
    )
  );
}

export function assessmentSearch(
  weights: AssessmentWeights | null,
  anchors?: readonly MobilityAnchor[],
) {
  const params = new URLSearchParams(weightsSearch(weights));
  anchors?.forEach(({ lat, lng }) => {
    params.append("anchor_lat", String(lat));
    params.append("anchor_lon", String(lng));
  });
  const query = params.toString();
  return query ? `?${query}` : "";
}
