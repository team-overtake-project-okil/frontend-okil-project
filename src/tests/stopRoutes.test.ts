import { describe, expect, it } from "vitest";
import { groupStopRoutes, routesCountLabel } from "../lib/stopRoutes";

describe("stop route groups", () => {
  it("omits empty groups", () => {
    expect(groupStopRoutes([])).toEqual([]);
  });

  it("groups modes in display order and preserves distinct letter suffixes", () => {
    const routes = ["Т03", "Тр23", "А39", "А39а", "А08а", "А01", "X7"].map(
      (number) => ({ number }),
    );
    expect(groupStopRoutes(routes)).toEqual([
      { kind: "bus", label: "Автобус", plates: ["1", "8а", "39а"] },
      { kind: "marshrutka", label: "Маршрутка", plates: ["39"] },
      { kind: "trolley", label: "Тролейбус", plates: ["23"] },
      { kind: "tram", label: "Трамвай", plates: ["3"] },
      { kind: "other", label: "Маршрут", plates: ["7"] },
    ]);
  });

  it("deduplicates and sorts numerically without changing the input", () => {
    const routes = [{ number: "Т10" }, { number: "Т2" }, { number: "Т10" }];
    expect(groupStopRoutes(routes)[0].plates).toEqual(["2", "10"]);
    expect(routes).toEqual([
      { number: "Т10" },
      { number: "Т2" },
      { number: "Т10" },
    ]);
  });

  it.each([
    ["A01", "bus", "1"],
    ["A39a", "bus", "39a"],
    ["A39", "marshrutka", "39"],
    ["TR02", "trolley", "2"],
    ["T01", "tram", "1"],
    ["Express", "other", "Express"],
    ["Т00", "tram", "0"],
  ])("supports route %s", (number, kind, plate) => {
    expect(groupStopRoutes([{ number }])).toEqual([
      expect.objectContaining({ kind, plates: [plate] }),
    ]);
  });
});

describe("Ukrainian route counts", () => {
  it.each([
    [0, "маршрутів"],
    [1, "маршрут"],
    [2, "маршрути"],
    [4, "маршрути"],
    [5, "маршрутів"],
    [11, "маршрутів"],
    [12, "маршрутів"],
    [14, "маршрутів"],
    [21, "маршрут"],
    [22, "маршрути"],
    [25, "маршрутів"],
    [101, "маршрут"],
    [111, "маршрутів"],
    [112, "маршрутів"],
  ])("formats %i", (count, word) => {
    expect(routesCountLabel(count)).toBe(`${count} ${word}`);
  });
});
