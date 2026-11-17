// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import DebugSearch from "./DebugSearch";
import { fetcher } from "./lib/fetcher";
import { coordsToH3 } from "./lib/h3";
vi.mock("./lib/fetcher", () => ({ fetcher: vi.fn() }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
it("opens the coordinate hexagon and rejects out-of-range latitude", async () => {
  const select = vi.fn();
  render(
    <DebugSearch auth="Basic test" onSelect={select} onPointSelect={vi.fn()} />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Пошук за" }));
  fireEvent.click(screen.getByRole("menuitemradio", { name: /Координати/ }));
  const input = screen.getByRole("textbox");
  fireEvent.change(input, { target: { value: "49.8429, 24.0316" } });
  fireEvent.click(screen.getByRole("button", { name: "Знайти" }));
  expect(select).toHaveBeenCalledWith(coordsToH3(49.8429, 24.0316));
  fireEvent.change(input, { target: { value: "149.8429, 24.0316" } });
  fireEvent.click(screen.getByRole("button", { name: "Знайти" }));
  expect(await screen.findByRole("alert")).toBeDefined();
  expect(select).toHaveBeenCalledTimes(1);
});
it("offers ambiguous ID matches instead of choosing the wrong source", async () => {
  const choose = vi.fn();
  const points = [1, 2].map((id) => ({
    id,
    kind: "poi",
    external_id: "123",
    source: `source${id}`,
    name: `Pharmacy ${id}`,
    lat: 49.84,
    lon: 24.03,
  }));
  vi.mocked(fetcher).mockResolvedValue({ rows: points });
  render(
    <DebugSearch auth="Basic test" onSelect={vi.fn()} onPointSelect={choose} />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Пошук за" }));
  fireEvent.click(screen.getByRole("menuitemradio", { name: /POI ID/ }));
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "123" } });
  fireEvent.click(screen.getByRole("button", { name: "Знайти" }));
  const second = await screen.findByRole("button", { name: /Pharmacy 2/ });
  expect(choose).not.toHaveBeenCalled();
  fireEvent.click(second);
  expect(choose).toHaveBeenCalledWith(points[1]);
});
