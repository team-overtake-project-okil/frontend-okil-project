import { describe, expect, it } from "vitest";
import { comfortColor } from "../lib/palette";

describe("comfort colors", () => {
  it.each([
    [0, "rgb(251, 164, 158)"],
    [25, "rgb(255, 194, 156)"],
    [50, "rgb(255, 233, 157)"],
    [75, "rgb(202, 231, 173)"],
    [100, "rgb(164, 223, 187)"],
    [12.5, "rgb(253, 179, 157)"],
    [87.5, "rgb(183, 227, 180)"],
  ])("maps score %s to its color", (score, color) => {
    expect(comfortColor(score)).toBe(color);
  });

  it.each([-1, -100, NaN, Infinity, -Infinity])(
    "uses the lowest color for %s",
    (score) => {
      expect(comfortColor(score)).toBe("rgb(251, 164, 158)");
    },
  );

  it("clamps scores above the scale", () => {
    expect(comfortColor(150)).toBe("rgb(164, 223, 187)");
  });
});
