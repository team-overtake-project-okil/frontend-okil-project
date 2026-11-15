import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "../lib/fetcher";
import { buildAssessmentWeights, defaultTogglers } from "../lib/assessmentWeights";
import {
  categoryExplanation,
  getHexagonAssessment,
  getHexagonRatings,
  hexagonAssessmentOptions,
  type CategoryRating,
} from "../lib/hexagonAssessment";

const hexId = "891f2242c0fffff";
const category: CategoryRating = {
  category: "daily",
  score: 88,
  enabled: true,
  weight: 0.2,
  adjusted_score: 2,
  explanation: "Текст із бекенду.",
};
const assessment = {
  h3_id: hexId,
  overall_rating: 88,
  categories: [category],
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function mockResponse(body: unknown, status = 200) {
  vi.stubEnv("VITE_BACKEND_URL", "https://api.example.test/");
  const request = vi
    .fn<typeof fetch>()
    .mockImplementation(async () => Response.json(body, { status }));
  vi.stubGlobal("fetch", request);
  return request;
}

describe("hexagon rating API contract", () => {
  it("reads list ratings without losing a zero score", async () => {
    const ratings = [
      { h3_id: hexId, overall_rating: 86 },
      { h3_id: "891f2242c0bffff", overall_rating: 0 },
    ];
    const request = mockResponse(ratings);
    const { signal } = new AbortController();

    await expect(getHexagonRatings(null, signal)).resolves.toEqual(ratings);
    expect(request).toHaveBeenCalledWith("https://api.example.test/hexagons", {
      signal,
    });
  });

  it("accepts an empty list of map ratings", async () => {
    mockResponse([]);
    await expect(getHexagonRatings(null)).resolves.toEqual([]);
  });

  it("reads explanation from a single detail request, preserving score and text", async () => {
    const request = mockResponse(assessment);
    const controller = new AbortController();
    const detail = await getHexagonAssessment(
      "id/with space",
      null,
      controller.signal,
    );
    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith(
      "https://api.example.test/hexagons/id%2Fwith%20space",
      { signal: controller.signal },
    );
    expect(detail).toEqual(assessment);
    expect(categoryExplanation(detail.categories[0])).toBe("Текст із бекенду.");
  });

  it("uses identical applied weights in list and detail requests", async () => {
    const request = mockResponse(assessment);
    request.mockResolvedValueOnce(Response.json([]));
    const draft = defaultTogglers();
    draft["02"] = { value: 100, on: false };
    draft["04"] = { value: 55, on: true };
    draft["07"] = { value: 100, on: true };
    const weights = buildAssessmentWeights(draft);
    await getHexagonRatings(weights);
    const client = new QueryClient();
    await client.fetchQuery(hexagonAssessmentOptions(hexId, weights));
    const [listUrl, detailUrl] = request.mock.calls.map(
      ([url]) => new URL(String(url)),
    );
    expect(listUrl.pathname).toBe("/hexagons");
    expect(detailUrl.pathname).toBe(`/hexagons/${hexId}`);
    expect(Object.fromEntries(listUrl.searchParams)).toEqual({
      weight_daily: "0",
      weight_enjoyment: "1",
      weight_food: "5",
      weight_health: "1",
      weight_mobility: "1",
      weight_security: "1",
      weight_sport: "1",
      weight_study: "2.75",
    });
    expect(detailUrl.search).toBe(listUrl.search);
  });

  it("truncates a detail rating for display and accepts empty categories", async () => {
    mockResponse({ ...assessment, overall_rating: 88.7, categories: [] });
    const client = new QueryClient();
    await expect(
      client.fetchQuery(hexagonAssessmentOptions(hexId, null)),
    ).resolves.toEqual({
      h3_id: hexId,
      overall_rating: 88,
      categories: [],
    });
  });

  it("identifies a missing hexagon separately from other errors", async () => {
    mockResponse({ detail: "Hexagon not found" }, 404);
    const detail = getHexagonAssessment("missing", null);
    await expect(detail).rejects.toBeInstanceOf(ApiError);
    await expect(detail).rejects.toMatchObject({ status: 404 });
  });

  it("keeps explanations for disabled categories and handles null or missing text", () => {
    const disabled = {
      ...category,
      enabled: false,
      weight: 0,
      adjusted_score: null,
    };
    expect(categoryExplanation(disabled)).toBe("Текст із бекенду.");
    const fallback = "Дані для пояснення поки відсутні.";
    expect(categoryExplanation({ ...disabled, explanation: null })).toBe(
      fallback,
    );
    expect(categoryExplanation({ ...disabled, explanation: "  " })).toBe(
      fallback,
    );
    expect(categoryExplanation(undefined)).toBe(fallback);
  });
});
