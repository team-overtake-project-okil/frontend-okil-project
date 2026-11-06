import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./fetcher";
import { buildAssessmentWeights, defaultTogglers } from "./assessmentWeights";
import { categoryExplanation, getHexagonAssessment, getHexagonRatings, type CategoryRating } from "./hexagonAssessment";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function mockResponse(body: unknown, status = 200) {
  vi.stubEnv("VITE_BACKEND_URL", "https://api.example.test/");
  const request = vi.fn().mockImplementation(async () => new Response(JSON.stringify(body), {
    status, headers: { "content-type": "application/json" },
  }));
  vi.stubGlobal("fetch", request);
  return request;
}

describe("hexagon explanation API contract", () => {
  it("reads explanation from a single detail request, preserving score and text", async () => {
    const body = { h3_id: "hex", overall_rating: 88, categories: [{ category: "daily", score: 88,
      enabled: true, weight: 0.2, adjusted_score: 2, explanation: "Текст із бекенду." }] };
    const request = mockResponse(body);
    const controller = new AbortController();
    const detail = await getHexagonAssessment("id/with space", null, controller.signal);
    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith("https://api.example.test/hexagons/id%2Fwith%20space", { signal: controller.signal });
    expect(detail).toEqual(body);
    expect(categoryExplanation(detail.categories[0])).toBe("Текст із бекенду.");
  });

  it("uses identical applied weights in list and detail requests", async () => {
    const request = mockResponse([]);
    const draft = defaultTogglers();
    draft["02"] = { value: 100, on: false };
    draft["04"] = { value: 60, on: true };
    const weights = buildAssessmentWeights(draft);
    await getHexagonRatings(weights);
    await getHexagonAssessment("hex", weights);
    const urls = request.mock.calls.map(([url]) => new URL(url));
    expect(urls[0].search).toBe(urls[1].search);
    expect(urls[1].searchParams.get("weight_daily")).toBe("0");
    expect(urls[1].searchParams.get("weight_study")).toBe("3");
  });

  it("identifies a missing hexagon separately from other errors", async () => {
    mockResponse({ detail: "Hexagon not found" }, 404);
    await expect(getHexagonAssessment("missing", null)).rejects.toMatchObject({ status: 404 });
    await expect(getHexagonAssessment("missing", null)).rejects.toBeInstanceOf(ApiError);
  });

  it("keeps explanations for disabled categories and handles null or missing text", () => {
    const category: CategoryRating = { category: "daily", score: 88, enabled: false,
      weight: 0, adjusted_score: null, explanation: "Доступність не змінилася." };
    expect(categoryExplanation(category)).toBe("Доступність не змінилася.");
    expect(categoryExplanation({ ...category, explanation: null })).toBe("Дані для пояснення поки відсутні.");
    expect(categoryExplanation({ ...category, explanation: "  " })).toBe("Дані для пояснення поки відсутні.");
    expect(categoryExplanation(undefined)).toBe("Дані для пояснення поки відсутні.");
  });
});
