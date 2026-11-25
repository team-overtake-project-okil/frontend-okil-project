import { describe, expect, it } from "vitest";
import { mobilityPresets, presetAnchors } from "../lib/mobilityPresets";
import { MAX_ANCHORS, validAnchors } from "../lib/mobilityAnchors";
import { isInLviv } from "../services/lvivBoundary";

describe("mobility preset locations", () => {
  it.each(mobilityPresets)(
    "$title has distinct usable points inside Lviv",
    (preset) => {
      const anchors = presetAnchors(preset);
      expect(validAnchors(anchors)).toBe(true);
      expect(anchors.length).toBeLessThanOrEqual(MAX_ANCHORS);
      expect(
        new Set(anchors.map((point) => `${point.lat},${point.lng}`)).size,
      ).toBe(anchors.length);
      expect(anchors.every((point) => isInLviv(point.lng, point.lat))).toBe(
        true,
      );
      expect(new Set(anchors.map((point) => point.id)).size).toBe(
        anchors.length,
      );
    },
  );
  it("creates independent editable copies of a preset", () => {
    const edited = presetAnchors(mobilityPresets[0]);
    edited[0].label = "Моя робота";
    expect(presetAnchors(mobilityPresets[0])[0].label).not.toBe("Моя робота");
  });
});
