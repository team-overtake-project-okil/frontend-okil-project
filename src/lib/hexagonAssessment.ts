import { queryOptions } from "@tanstack/react-query";
import { type AssessmentWeights } from "./assessmentWeights";
import { assessmentSearch, type MobilityAnchor } from "./mobilityAnchors";
import { fetcher } from "./fetcher";

export type CategoryRating = {
  category: string;
  score: number;
  enabled: boolean;
  weight: number;
  adjusted_score: number | null;
  explanation: string | null;
};

export type HexagonRouteProperties = {
  transport_mode: string;
  mode: string;
  section_type: string;
  route_index: number;
  section_index: number;
  color: string;
  line_style: string;
  route_number?: string;
  label?: string;
  headsign?: string;
};

export type HexagonRouteFeature = {
  type: "Feature";
  properties: HexagonRouteProperties;
  geometry: {
    type: "LineString";
    coordinates: [number, number][];
  };
};

export type HexagonRoutes = {
  type: "FeatureCollection";
  features: HexagonRouteFeature[];
};

export type HexagonAssessment = {
  h3_id: string;
  overall_rating: number;
  categories: CategoryRating[];
  routes: HexagonRoutes;
};

export const categoryLabels = [
  ["mobility", "Мобільність"],
  ["daily", "Щоденні потреби"],
  ["health", "Здоров'я"],
  ["study", "Освіта"],
  ["enjoyment", "Дозвілля"],
  ["sport", "Спорт"],
  ["food", "Їжа"],
  ["security", "Безпека"],
] as const;

export function hexagonAssessmentOptions(
  hexId: string | null,
  weights: AssessmentWeights | null,
  anchors?: readonly MobilityAnchor[],
) {
  return queryOptions({
    queryKey: ["hexagon-assessment", hexId, weights, anchors] as const,
    enabled: hexId !== null,
    queryFn: async () => {
      if (hexId === null) throw new Error("A hexagon must be selected.");
      const assessment = (await fetcher(
        `/hexagons/${encodeURIComponent(hexId)}${assessmentSearch(weights, anchors)}`,
      )) as HexagonAssessment;
      return {
        ...assessment,
        overall_rating: Math.trunc(assessment.overall_rating),
      };
    },
  });
}

export const comparisonLabels = ["А", "Б", "В"] as const;

export const comparisonColors = ["#b26782", "#827eae", "#ad8053"] as const;

export function categoryExplanation(
  category: CategoryRating | undefined,
): string {
  return category?.explanation?.trim() || "Дані для пояснення поки відсутні.";
}

export function getHexagonRatings(
  weights: AssessmentWeights | null,
  signal?: AbortSignal,
  anchors?: readonly MobilityAnchor[],
): Promise<{ h3_id: string; overall_rating: number }[]> {
  return fetcher(
    `/hexagons${assessmentSearch(weights, anchors)}`,
    signal ? { signal } : undefined,
  );
}

export function getHexagonAssessment(
  id: string,
  weights: AssessmentWeights | null,
  signal?: AbortSignal,
  anchors?: readonly MobilityAnchor[],
): Promise<HexagonAssessment> {
  return fetcher(
    `/hexagons/${encodeURIComponent(id)}${assessmentSearch(weights, anchors)}`,
    signal ? { signal } : undefined,
  );
}
