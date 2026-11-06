import { queryOptions } from "@tanstack/react-query";
import { weightsSearch, type AssessmentWeights } from "./assessmentWeights";
import { fetcher } from "./fetcher";



export type CategoryRating = {
  category: string;
  score: number;
  enabled: boolean;
  weight: number;
  adjusted_score: number | null;
  explanation: string | null;
};

type HexagonAssessment = {
  h3_id: string;
  overall_rating: number;
  categories: CategoryRating[];
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
) {
  return queryOptions({
    queryKey: ["hexagon-assessment", hexId, weights] as const,
    enabled: hexId !== null,
    queryFn: async () => {
      if (hexId === null) throw new Error("A hexagon must be selected.");
      const assessment = (await fetcher(
        `/hexagons/${encodeURIComponent(hexId)}${weightsSearch(weights)}`,
      )) as HexagonAssessment;
      return { ...assessment, overall_rating: Math.trunc(assessment.overall_rating) };
    },
  });
}

export const comparisonLabels = ["А", "Б", "В"] as const;

export const comparisonColors = ["#b26782", "#827eae", "#ad8053"] as const;

export function categoryExplanation(
  category: CategoryRating | undefined,
): string {
  return (
    category?.explanation?.trim() ||
    "Дані для пояснення поки відсутні."
  );
}

export function getHexagonRatings(
  weights: AssessmentWeights | null,
  signal?: AbortSignal,
): Promise<{ h3_id: string; overall_rating: number }[]> {
  return fetcher(
    `/hexagons${weightsSearch(weights)}`,
    signal ? { signal } : undefined,
  );
}

export function getHexagonAssessment(
  id: string,
  weights: AssessmentWeights | null,
  signal?: AbortSignal,
): Promise<HexagonAssessment> {
  return fetcher(
    `/hexagons/${encodeURIComponent(id)}${weightsSearch(weights)}`,
    signal ? { signal } : undefined,
  );
}