import { queryOptions } from "@tanstack/react-query";
import { weightsSearch, type AssessmentWeights } from "./assessmentWeights";
import { fetcher } from "./fetcher";

type CategoryRating = {
  category: string;
  score: number;
  enabled: boolean;
  weight: number;
  adjusted_score: number | null;
  description?: string | null;
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
