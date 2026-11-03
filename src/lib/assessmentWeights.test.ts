import { describe, it, expect } from "vitest";
import {
  defaultTogglers,
  buildAssessmentWeights,
  sameWeights,
  weightsSearch,
} from "./assessmentWeights";
describe("backend weight contract", () => {
  it("uses all eight scored categories and weight one by default", () => {
    const weights = buildAssessmentWeights(defaultTogglers());
    expect(Object.keys(weights).sort()).toEqual([
      "weight_daily",
      "weight_enjoyment",
      "weight_food",
      "weight_health",
      "weight_mobility",
      "weight_security",
      "weight_sport",
      "weight_study",
    ]);
    expect(Object.values(weights)).toEqual([1, 1, 1, 1, 1, 1, 1, 1]);
  });
  it("applies food priority, detects changes and serializes disabled food", () => {
    const defaults = buildAssessmentWeights(defaultTogglers());
    const draft = defaultTogglers();
    draft["07"] = { value: 100, on: true };
    const increased = buildAssessmentWeights(draft);
    expect(increased.weight_food).toBe(5);
    expect(increased.weight_security).toBe(1);
    expect(sameWeights(defaults, increased)).toBe(false);
    expect(
      new URLSearchParams(weightsSearch(increased).slice(1)).get("weight_food"),
    ).toBe("5");
    draft["07"] = { value: 100, on: false };
    const disabled = buildAssessmentWeights(draft);
    expect(disabled.weight_food).toBe(0);
    expect(
      new URLSearchParams(weightsSearch(disabled).slice(1)).get("weight_food"),
    ).toBe("0");
    expect(buildAssessmentWeights(defaultTogglers()).weight_food).toBe(1);
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
