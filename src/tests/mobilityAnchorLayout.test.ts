import { describe, expect, it } from "vitest";
import {
  anchorMarkerSize,
  groupAnchorPositions,
  type ProjectedAnchor,
} from "../components/mapbox/mobilityAnchorLayout";
const point = (id: string, x: number, y: number): ProjectedAnchor => ({
  x,
  y,
  anchor: { id, label: id, lat: 49.84, lng: 24.03, source: "map" },
});
describe("mobility marker layout", () => {
  it("groups nearby projected points and retains distant places", () => {
    expect(
      groupAnchorPositions([
        point("a", 0, 0),
        point("b", 12, 10),
        point("c", 100, 100),
      ]).map((group) => group.map((item) => item.anchor.id)),
    ).toEqual([["a", "b"], ["c"]]);
  });
  it("splits the same places when their projected distance increases after zoom", () => {
    expect(
      groupAnchorPositions([point("a", 0, 0), point("b", 40, 35)]),
    ).toHaveLength(2);
  });
  it("groups chains and coincident points without dropping any place", () => {
    const items = [
      point("a", 0, 0),
      point("b", 24, 0),
      point("c", 48, 0),
      point("d", 48, 0),
    ];
    expect(groupAnchorPositions(items)[0]).toHaveLength(4);
    expect(groupAnchorPositions([])).toEqual([]);
  });
  it("keeps individual markers compact at overview scale and caps their size", () => {
    expect(anchorMarkerSize(10, 1)).toBe(10);
    expect(anchorMarkerSize(12, 1)).toBeLessThan(anchorMarkerSize(16, 1));
    expect(anchorMarkerSize(20, 1)).toBe(18);
    expect(anchorMarkerSize(10, 5)).toBe(22);
  });
});
