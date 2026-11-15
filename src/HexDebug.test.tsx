// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import HexDebug from "./HexDebug";
import { fetcher } from "./lib/fetcher";
import type { Dot } from "./DebugMap";
vi.stubGlobal("PointerEvent", MouseEvent);
vi.spyOn(window, "scrollTo").mockImplementation(() => {});
vi.mock("./lib/fetcher", () => ({ fetcher: vi.fn() }));
vi.mock("./DebugMap", () => ({
  default: ({
    dots,
    onSelect,
  }: {
    dots: Dot[];
    onSelect: (id: string) => void;
  }) => (
    <div>
      <button onClick={() => onSelect("891e768b2afffff")}>
        Обрати гексагон
      </button>
      {dots.map((p) => (
        <span key={p.id}>Маркер {p.name}</span>
      ))}
    </div>
  ),
}));
afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.clearAllMocks();
  history.replaceState(null, "", "/");
});
it("shows contributing POIs from every page and filters the map and list together", async () => {
  const point = (id: number, used = true) => ({
    id,
    used,
    name: `POI ${id}`,
    kind: "poi",
    category: "health",
    type: "hospital",
    distance: 40,
    inside: false,
    weight: 1,
    lat: 49.84,
    lon: 24.03,
  });
  vi.mocked(fetcher).mockImplementation(async (path) => {
    if (path === "/debug/session")
      return { token: "test-token", expires_at: Date.now() / 1000 + 900 };
    if (path === "/debug/config")
      return { types: [], categories: ["health"], batch_limit: 200 };
    if (String(path).startsWith("/hexagons?") || path === "/debug/ratings")
      return [{ h3_id: "891e768b2afffff", overall_rating: 50 }];
    if (
      String(path).includes("/hexagons/") &&
      String(path).includes("/points?offset=0")
    )
      return { rows: [point(1), point(2, false)], total: 3 };
    if (
      String(path).includes("/hexagons/") &&
      String(path).includes("/points?offset=2")
    )
      return { rows: [point(3)], total: 3 };
    if (String(path).startsWith("/debug/points?")) {
      const query = new URLSearchParams(String(path).split("?")[1]);
      return query.get("offset") === "0"
        ? { rows: [point(4)], next_offset: 1 }
        : { rows: [point(5)], next_offset: null };
    }
    return [
      {
        experiment: 55,
        h3_id: "891e768b2afffff",
        stored: 50,
        fresh: 55,
        categories: { fresh: [], stored: [], experiment: [] },
        steps: [],
      },
    ];
  });
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <HexDebug />
    </QueryClientProvider>,
  );
  fireEvent.change(screen.getByLabelText("Логін"), {
    target: { value: "admin" },
  });
  fireEvent.change(screen.getByLabelText("Пароль"), {
    target: { value: "test" },
  });
  fireEvent.click(screen.getByText("Увійти"));
  fireEvent.click(await screen.findByText("Обрати гексагон"));
  expect(await screen.findByText("Маркер POI 3")).toBeDefined();
  expect(screen.getByText("Маркер POI 1")).toBeDefined();
  expect(screen.queryByText("Маркер POI 2")).toBeNull();
  expect(screen.queryByText("Експеримент")).toBeNull();
  expect(screen.queryByText("Ваги")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Невраховані" }));
  expect(await screen.findByText("Маркер POI 2")).toBeDefined();
  fireEvent.click(screen.getByRole("button", { name: /^Здоров’я/ }));
  expect(screen.getByRole("button", { name: "POI 2" })).toBeDefined();
  expect(screen.queryByText("Маркер POI 1")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Пріоритети" }));
  expect(
    screen.getByRole("complementary", { name: "Персональна оцінка" }),
  ).toBeDefined();
  expect(
    screen.getByRole("complementary", { name: "Оцінка гексагону" }),
  ).toBeDefined();
  expect(screen.getByRole("button", { name: "Точки" })).toBeDefined();
  expect(
    await screen.findByRole("switch", { name: "Мобільність" }),
  ).toBeDefined();
  fireEvent.click(screen.getByRole("button", { name: "Застосувати" }));
  expect(await screen.findByRole("button", { name: "POI 2" })).toBeDefined();
  fireEvent.click(screen.getByRole("button", { name: "Вигляд" }));
  fireEvent.click(screen.getByRole("switch", { name: "Усі POI на карті" }));
  expect(await screen.findByText("Маркер POI 5")).toBeDefined();
  expect(screen.getByText("Маркер POI 4")).toBeDefined();
  fireEvent.click(screen.getByRole("switch", { name: "Усі POI на карті" }));
  expect(await screen.findByText("Маркер POI 2")).toBeDefined();
  client.clear();
});
