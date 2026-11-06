import { fetcher } from "./fetcher";
import { weightsSearch, type AssessmentWeights } from "./assessmentWeights";

export type CategoryRating = {
  category: string;
  score: number;
  enabled: boolean;
  weight: number;
  adjusted_score: number | null;
  explanation: string | null;
};

export type HexagonRating = { h3_id: string; overall_rating: number };
export type HexagonAssessment = HexagonRating & { categories: CategoryRating[] };

export function getHexagonRatings(weights: AssessmentWeights | null, signal?: AbortSignal): Promise<HexagonRating[]> {
  return fetcher(`/hexagons${weightsSearch(weights)}`, signal ? { signal } : undefined);
}

export function getHexagonAssessment(id: string, weights: AssessmentWeights | null, signal?: AbortSignal): Promise<HexagonAssessment> {
  return fetcher(`/hexagons/${encodeURIComponent(id)}${weightsSearch(weights)}`, signal ? { signal } : undefined);
}

export function categoryExplanation(category: CategoryRating | undefined): string {
  return category?.explanation?.trim() || "Дані для пояснення поки відсутні.";
}
