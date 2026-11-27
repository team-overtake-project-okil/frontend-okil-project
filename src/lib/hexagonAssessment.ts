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
  anchor_index?: number;
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

export function anchorRouteColors(routes: HexagonRoutes | null) {
  const sections = new Map<number, HexagonRouteProperties>();
  for (const { properties } of routes?.features ?? []) {
    const index = properties.anchor_index;
    if (index === undefined || !/^#[0-9a-f]{6}$/i.test(properties.color))
      continue;

    const current = sections.get(index);
    const solid = properties.line_style === "solid";
    const currentSolid = current?.line_style === "solid";
    if (
      !current ||
      (solid && !currentSolid) ||
      (solid === currentSolid &&
        properties.section_index > current.section_index)
    ) {
      sections.set(index, properties);
    }
  }
  return new Map(
    Array.from(sections, ([index, section]) => [index, section.color]),
  );
}

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

export function hexagonComparisonOptions(
  ids: readonly string[],
  weights: AssessmentWeights | null,
  anchors: readonly MobilityAnchor[],
  enabled: boolean,
) {
  return queryOptions({
    queryKey: ["hexagon-comparison", ids, weights, anchors] as const,
    enabled: enabled && ids.length >= 2,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams(assessmentSearch(weights, anchors));
      ids.forEach((id, index) => {
        params.append("h3_id", id);
        params.append("color", comparisonColors[index]);
      });
      const result = (await fetcher(`/hexagons/compare?${params}`, {
        method: "GET",
        signal,
      })) as HexagonAssessment[];
      return result.map((item) => ({
        ...item,
        overall_rating: Math.trunc(item.overall_rating),
      }));
    },
  });
}

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
