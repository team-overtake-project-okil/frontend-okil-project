// @vitest-environment jsdom
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import HexDebug from "./HexDebug";
import { fetcher } from "./lib/fetcher";
import type { Dot } from "./DebugMap";
vi.mock("./lib/fetcher", () => ({ fetcher: vi.fn() }));
vi.mock("./components/AddressSearch", () => ({ AddressSearch: () => null }));
vi.mock("./DebugMap", () => ({
  default: ({
    onView,
    dots,
    onPointSelect,
    focus,
    scores,
  }: {
    onView: (ids: string[], camera: number[]) => void;
    dots: Dot[];
    onPointSelect: (point: Dot) => void;
    focus: Dot | null;
    scores: Record<string, number>;
  }) => (
    <>
      <output aria-label="Бали гексагонів">{JSON.stringify(scores)}</output>
      <button onClick={() => onView(["8928308280bffff"], [24, 49, 13])}>
        Видима область
      </button>
      {dots.map((p) => (
        <button key={p.id} onClick={() => onPointSelect(p)}>
          Маркер {p.name}
        </button>
      ))}
      {focus && (
        <div role="dialog">
          {focus.name} · {focus.categoryLabel} · {focus.influence}
        </div>
      )}
    </>
  ),
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  history.replaceState(null, "", "/");
});
it("loads all visible hexagon points and reloads them when the category changes", async () => {
  vi.mocked(fetcher).mockImplementation(async (path, init) => {
    if (path === "/debug/config")
      return { types: [], categories: ["health"], batch_limit: 200 };
    if (path === "/debug/ratings")
      return [
        {
          h3_id: "8928308280bffff",
          overall_rating: 75,
          category_scores: { health: 0 },
        },
      ];
    if (path === "/debug/points") {
      const category = JSON.parse(init?.body as string).category;
      return {
        rows: [
          {
            id: 1,
            kind: "poi",
            name: category ? "Лише здоров’я" : "Усі об’єкти",
            category: "health",
            lat: 49,
            lon: 24,
            h3_id: "8928308280bffff",
          },
        ],
      };
    }
    return [];
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
    target: { value: "team" },
  });
  fireEvent.change(screen.getByLabelText("Пароль"), {
    target: { value: "example" },
  });
  fireEvent.click(screen.getByText("Увійти"));
  fireEvent.click(await screen.findByText("Видима область"));
  fireEvent.click(screen.getByRole("button", { name: "Усі точки на мапі" }));
  expect(await screen.findByText("Маркер Усі об’єкти")).toBeDefined();
  expect(screen.getByLabelText("Бали гексагонів").textContent).toContain(
    '"8928308280bffff":75',
  );
  fireEvent.change(screen.getByLabelText("Категорія точок"), {
    target: { value: "health" },
  });
  expect(await screen.findByText("Маркер Лише здоров’я")).toBeDefined();
  expect(screen.getByLabelText("Бали гексагонів").textContent).toContain(
    '"8928308280bffff":0',
  );
  expect(
    vi
      .mocked(fetcher)
      .mock.calls.filter(([path]) => path === "/debug/points")
      .map(([, init]) => JSON.parse(init?.body as string)),
  ).toEqual([
    { ids: ["8928308280bffff"], category: null },
    { ids: ["8928308280bffff"], category: "health" },
  ]);
  fireEvent.click(
    screen.getByRole("button", { name: "Точки вибраного гексагона" }),
  );
  expect(screen.queryByText("Маркер Лише здоров’я")).toBeNull();
  client.clear();
});
it("opens a named point with its category contribution from a map marker", async () => {
  history.replaceState(null, "", "/?hex=8928308280bffff");
  vi.mocked(fetcher).mockImplementation(async (path) => {
    if (path === "/debug/config")
      return { types: [], categories: [], batch_limit: 200 };
    if (path.includes("/points?"))
      return {
        rows: [
          {
            id: 1,
            kind: "poi",
            name: "Аптека",
            type: "pharmacy",
            category: "health",
            lat: 49,
            lon: 24,
            distance: 100,
            weight: 0.5,
            contribution: 50,
            used: true,
            source: "test",
            external_id: "1",
            h3_id: "8928308280bffff",
            mismatch: false,
            inside: true,
          },
        ],
        total: 1,
      };
    if (path.includes("/debug/hexagons/"))
      return {
        stored: 80,
        fresh: 80,
        experiment: 80,
        categories: {
          stored: [{ score: 80 }],
          fresh: [{ score: 80 }],
          experiment: [{ category: "health", score: 80, weight: 1 }],
        },
        steps: [
          {
            category: "health",
            type: "pharmacy",
            weight: 0.5,
            contribution: 50,
            score: 100,
            radii: [100, 200, 300],
            used: [{ id: 1, distance: 100 }],
          },
        ],
      };
    return [];
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
    target: { value: "team" },
  });
  fireEvent.change(screen.getByLabelText("Пароль"), {
    target: { value: "example" },
  });
  fireEvent.click(screen.getByText("Увійти"));
  fireEvent.click(await screen.findByText("Маркер Аптека"));
  await waitFor(() =>
    expect(screen.getByRole("dialog").textContent).toContain(
      "Внесок у категорію «Здоров’я» — 50.00 бала",
    ),
  );
  client.clear();
});
it("applies edited weights to the visible IDs only after an explicit recalculation", async () => {
  vi.mocked(fetcher).mockImplementation(async (path) =>
    path === "/debug/config"
      ? { types: ["cafe"], categories: ["food"], batch_limit: 200 }
      : [],
  );
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <HexDebug />
    </QueryClientProvider>,
  );
  fireEvent.change(screen.getByLabelText("Логін"), {
    target: { value: "team" },
  });
  fireEvent.change(screen.getByLabelText("Пароль"), {
    target: { value: "example" },
  });
  fireEvent.click(screen.getByText("Увійти"));
  fireEvent.click(await screen.findByText("Видима область"));
  fireEvent.click(screen.getByRole("button", { name: "Ваги" }));
  fireEvent.change(screen.getByLabelText("cafe"), { target: { value: "2" } });
  expect(
    vi.mocked(fetcher).mock.calls.some(([p]) => p === "/debug/recalculate"),
  ).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: "Перерахувати (1)" }));
  await waitFor(() =>
    expect(
      vi
        .mocked(fetcher)
        .mock.calls.find(([p]) => p === "/debug/recalculate")?.[1]?.body,
    ).toBe(
      JSON.stringify({
        ids: ["8928308280bffff"],
        types: { cafe: 2 },
        categories: {},
      }),
    ),
  );
  fireEvent.click(screen.getByText("Скинути ваги"));
  expect((screen.getByLabelText("cafe") as HTMLInputElement).value).toBe("1");
  client.clear();
});
