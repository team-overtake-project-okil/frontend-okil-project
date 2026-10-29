import { describe, it, expect } from "vitest";
import {
  defaultTogglers,
  buildAssessmentWeights,
  sameWeights,
  weightsSearch,
} from "./assessmentWeights";
describe("backend weight contract", () => {
  it("uses seven scored categories and weight one by default", () => {
    const weights = buildAssessmentWeights(defaultTogglers());
    expect(Object.keys(weights)).toHaveLength(7);
    expect(Object.values(weights)).toEqual([1, 1, 1, 1, 1, 1, 1]);
    expect(weights).not.toHaveProperty("weight_food");
  });
  it("maps disabled categories to zero and maximum importance to five", () => {
    const draft = defaultTogglers();
    draft["01"] = { value: 100, on: false };
    draft["03"] = { value: 100, on: true };
    expect(buildAssessmentWeights(draft)).toMatchObject({
      weight_mobility: 0,
      weight_health: 5,
    });
  });
  it("keeps applied weights independent of draft edits and restores defaults", () => {
    const applied = defaultTogglers();
    const draft = { ...applied, "02": { value: 80, on: false } };
    expect(
      sameWeights(
        buildAssessmentWeights(applied),
        buildAssessmentWeights(draft),
      ),
    ).toBe(false);
    expect(buildAssessmentWeights(applied).weight_daily).toBe(1);
    expect(
      sameWeights(
        buildAssessmentWeights(applied),
        buildAssessmentWeights(defaultTogglers()),
      ),
    ).toBe(true);
  });
  it("preserves API defaults until application and serializes zeros", () => {
    expect(weightsSearch(null)).toBe("");
    const draft = defaultTogglers();
    draft["06"] = { value: 20, on: false };
    const query = new URLSearchParams(
      weightsSearch(buildAssessmentWeights(draft)).slice(1),
    );
    expect(query.get("weight_sport")).toBe("0");
    expect(query.get("weight_security")).toBe("1");
  });
});
