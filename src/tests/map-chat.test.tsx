// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Map } from "../components/map";
import type { HexagonRoutes } from "../lib/hexagonAssessment";
import type { HexStopProperties } from "../lib/useStopsByHex";

// Exercise the real panel lifecycle without requiring WebGL or a chat server.
vi.mock("../components/MapboxMap", () => ({
  MapboxMap: ({
    onHexSelect,
    onStopInPanel,
    onAddToComparison,
    comparisonActionLabel,
    assessmentRoutes,
  }: {
    onHexSelect: (id: string | null) => void;
    onAddToComparison?: () => void;
    comparisonActionLabel?: string;
    assessmentRoutes?: HexagonRoutes | null;
    onStopInPanel: (stop: HexStopProperties) => boolean;
  }) => (
    <div>
      <button onClick={() => onStopInPanel({ id: 1, name: "Тестова зупинка", in_hex: true, routes: [] })}>
        Відкрити маршрути зупинки
      </button>
      <button onClick={() => onHexSelect("selected-hex")}>
        Вибрати тестову ділянку
      </button>
      <button onClick={() => onHexSelect("selected-hex-b")}>
        Вибрати іншу ділянку
      </button>
      <button onClick={() => onHexSelect("selected-hex-c")}>Вибрати третю ділянку</button>
      <button onClick={() => onHexSelect("selected-hex-d")}>Вибрати четверту ділянку</button>
      <button onClick={() => onHexSelect(null)}>Зняти тестовий вибір</button>
      {assessmentRoutes?.features.length ? (
        <div data-testid="map-route-coordinates">
          {assessmentRoutes.features.map((feature) => feature.geometry.coordinates[0].join(",")).join(";")}
        </div>
      ) : null}
      {onAddToComparison && (
        <button onClick={onAddToComparison}>{comparisonActionLabel ?? "Додати до порівняння"}</button>
      )}
    </div>
  ),
}));

let client: QueryClient;
beforeEach(() => {
  vi.stubEnv("VITE_BACKEND_URL", "https://ratings.example.test");
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) =>
      Response.json(
        new URL(url).pathname === "/hexagons/compare"
          ? [
              { h3_id: "selected-hex", overall_rating: 94, categories: [], routes: { type: "FeatureCollection", features: [] } },
              { h3_id: "selected-hex-b", overall_rating: 72, categories: [], routes: { type: "FeatureCollection", features: [] } },
            ]
          : url.includes("/hexagons/")
          ? {
              h3_id: url.includes("selected-hex-b")
                ? "selected-hex-b"
                : "selected-hex",
              overall_rating: url.includes("selected-hex-b") ? 72 : 94,
              categories: [
                {
                  category: "mobility",
                  score: 100,
                  enabled: true,
                  weight: 1,
                  adjusted_score: 100,
                  explanation: "Поруч є зупинки.",
                },
              ],
            }
          : [{ h3_id: "selected-hex", overall_rating: 94 }],
      ),
    ),
  );
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
});
afterEach(() => {
  cleanup();
  client.clear();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function setup() {
  render(
    <QueryClientProvider client={client}>
      <Map
        searchedLocation={null}
        onAddressChange={vi.fn()}
        clearSelectionKey={0}
      />
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

it("opens assessments without opening the assistant", async () =>
{
  const user = setup();
  await user.click(screen.getByRole("button", { name: "Вибрати тестову ділянку" }));
  await screen.findByText("94", { selector: ".score-value" });
  expect(screen.queryByRole("textbox", { name: "Твоє запитання" })).toBeNull();
  expect(screen.getByRole("button", { name: "Запитати за цей гексагон" })).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Категорії" }));
  expect(screen.queryByRole("textbox", { name: "Твоє запитання" })).toBeNull();
});

it("preserves the draft between independent panel modes and after closing chat", async () =>
{
  const user = setup();
  await user.click(screen.getByRole("button", { name: "Вибрати тестову ділянку" }));
  await screen.findByText("94", { selector: ".score-value" });
  await user.click(screen.getByRole("button", { name: "Запитати за цей гексагон" }));
  await user.type(screen.getByLabelText("Твоє запитання"), "Моя чернетка");
  await user.click(screen.getByRole("button", { name: "Вибрати тестову ділянку" }));
  expect((screen.getByLabelText("Твоє запитання") as HTMLTextAreaElement).value).toBe("Моя чернетка");
  await user.click(screen.getByRole("button", { name: "Закрити чат" }));
  expect(screen.queryByRole("textbox", { name: "Твоє запитання" })).toBeNull();
  await user.click(screen.getByRole("button", { name: "Запитати за цей гексагон" }));
  expect((screen.getByLabelText("Твоє запитання") as HTMLTextAreaElement).value).toBe("Моя чернетка");
  await user.click(screen.getByRole("button", { name: "Закрити чат" }));
  expect(screen.queryByRole("region", { name: "Чат із помічником" })).toBeNull();
  await user.click(screen.getByRole("button", { name: "Помічник Окіл" }));
  expect((screen.getByLabelText("Твоє запитання") as HTMLTextAreaElement).value).toBe("Моя чернетка");
  expect(screen.queryByRole("button", { name: "Оцінки ділянки" })).toBeNull();
});

it("attaches an area only through the explicit assessment action", async () =>
{
  const user = setup();
  await user.click(screen.getByRole("button", { name: "Вибрати тестову ділянку" }));
  await screen.findByText("94", { selector: ".score-value" });
  await user.click(screen.getByRole("button", { name: "Запитати за цей гексагон" }));
  const question = "Які слабкі сторони цієї ділянки?";
  await user.click(screen.getByRole("button", { name: question }));
  expect((screen.getByLabelText("Твоє запитання") as HTMLTextAreaElement).value).toBe(question);
  expect(screen.queryByText(question, { selector: ".chat-message .chat-message-text" })).toBeNull();
  await user.click(screen.getByRole("button", { name: "Вибрати іншу ділянку" }));
  await screen.findByText("72", { selector: ".score-value" });
  await user.click(screen.getByRole("button", { name: "Помічник Окіл" }));
  await user.click(screen.getByRole("button", { name: "Помічник Окіл" }));
  expect(screen.getByText("72", { selector: ".score-value" }).closest("[hidden]")).toBeNull();
  expect(screen.queryByText("Про цей гексагон: 94/100")).toBeNull();
  expect(screen.getByRole("button", { name: "Як обрати ділянку для життя?" })).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Закрити чат" }));
  await user.click(screen.getByRole("button", { name: "Запитати за цей гексагон" }));
  expect(screen.getByText("Про цей гексагон: 72/100")).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Прибрати ділянку з контексту" }));
  expect(screen.queryByText("Про цей гексагон: 72/100")).toBeNull();
});

it("offers general questions when no area is attached", async () =>
{
  const user = setup();
  await user.click(screen.getByRole("button", { name: "Помічник Окіл" }));
  await user.click(screen.getByRole("button", { name: "Що означають оцінки категорій?" }));
  expect((screen.getByLabelText("Твоє запитання") as HTMLTextAreaElement).value).toBe("Що означають оцінки категорій?");
  await user.click(screen.getByRole("button", { name: "Вибрати тестову ділянку" }));
  await screen.findByText("94", { selector: ".score-value" });
  expect((screen.getByLabelText("Твоє запитання") as HTMLTextAreaElement).value).toBe("Що означають оцінки категорій?");
  await user.click(screen.getByRole("button", { name: "Вибрати іншу ділянку" }));
  await screen.findByText("72", { selector: ".score-value" });
  expect((screen.getByLabelText("Твоє запитання") as HTMLTextAreaElement).value).toBe("Що означають оцінки категорій?");
  expect(screen.queryByText("Про цей гексагон: 72/100")).toBeNull();
  await user.click(screen.getByRole("button", { name: "Зняти тестовий вибір" }));
  expect(screen.getByLabelText("Твоє запитання")).toBeTruthy();
  expect(screen.queryByText("Про цей гексагон: 94/100")).toBeNull();
});

it("attaches the selected hexagon from the toolbar assistant without losing the draft", async () =>
{
  const user = setup();
  await user.click(screen.getByRole("button", { name: "Вибрати тестову ділянку" }));
  await screen.findByText("94", { selector: ".score-value" });
  await user.click(screen.getByRole("button", { name: "Помічник Окіл" }));
  await user.type(screen.getByLabelText("Твоє запитання"), "Моя чернетка");
  expect(screen.queryByText("Про цей гексагон: 94/100")).toBeNull();
  await user.click(screen.getByRole("button", { name: "Запитати за цей гексагон" }));
  expect(screen.getByText("Про цей гексагон: 94/100")).toBeTruthy();
  expect((screen.getByRole("button", { name: "Гексагон додано" }) as HTMLButtonElement).disabled).toBe(true);
  expect((screen.getByLabelText("Твоє запитання") as HTMLTextAreaElement).value).toBe("Моя чернетка");
  expect(screen.queryByText("Моя чернетка", { selector: ".chat-message .chat-message-text" })).toBeNull();
  await user.click(screen.getByRole("button", { name: "Вибрати іншу ділянку" }));
  await screen.findByText("72", { selector: ".score-value" });
  await user.click(screen.getByRole("button", { name: "Запитати за цей гексагон" }));
  expect(screen.getByText("Про цей гексагон: 72/100")).toBeTruthy();
  expect(screen.queryByText("Про цей гексагон: 94/100")).toBeNull();
  expect((screen.getByRole("button", { name: "Гексагон додано" }) as HTMLButtonElement).disabled).toBe(true);
  await user.click(screen.getByRole("button", { name: "Прибрати ділянку з контексту" }));
  expect((screen.getByRole("button", { name: "Запитати за цей гексагон" }) as HTMLButtonElement).disabled).toBe(false);
});

it("adds selected hexagons from the map while comparison is active", async () => {
  const user = setup();
  await user.click(
    screen.getByRole("button", { name: "Вибрати тестову ділянку" }),
  );
  await screen.findByText("94", { selector: ".score-value" });
  await user.click(screen.getByRole("button", { name: "Пріоритети" }));
  expect(screen.queryByRole("button", { name: "Додати до порівняння" })).toBeNull();
  await user.click(screen.getByRole("button", { name: "Порівняти ділянки" }));
  await user.click(screen.getByRole("button", { name: "Додати до порівняння" }));
  expect(document.getElementById("weights-panel")).toBeTruthy();
  expect(screen.getByText("1/3")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Додати до порівняння" })).toBeNull();
  await user.click(
    screen.getByRole("button", { name: "Вибрати іншу ділянку" }),
  );
  await user.click(
    screen.getByRole("button", { name: "Додати до порівняння" }),
  );
  expect(screen.getByText("2/3")).toBeTruthy();
  let releaseComparison: () => void = () => {};
  const comparisonGate = new Promise<void>((resolve) => {
    releaseComparison = resolve;
  });
  const fetchImplementation = vi.mocked(fetch).getMockImplementation();
  vi.mocked(fetch).mockImplementationOnce(async (...args) => {
    await comparisonGate;
    return fetchImplementation!(...args);
  });
  await user.click(screen.getByRole("button", { name: "Порівняти" }));
  const table = screen.getByRole("table");
  expect(screen.queryByText("2/3")).toBeNull();
  expect(table.querySelectorAll(".comparison-score-skeleton")).toHaveLength(
    table.querySelectorAll("tbody td").length,
  );
  releaseComparison();
  expect(document.getElementById("weights-panel")).toBeTruthy();
  await screen.findByText("94", { selector: ".comparison-score .inline-text" });
  const requests = vi.mocked(fetch).mock.calls.filter(([url]) =>
    new URL(String(url)).pathname === "/hexagons/compare",
  );
  expect(requests).toHaveLength(1);
  expect(requests[0][1]?.method).toBe("GET");
  expect(requests[0][1]?.body).toBeUndefined();
  const params = new URL(String(requests[0][0])).searchParams;
  expect(params.getAll("h3_id")).toEqual(["selected-hex", "selected-hex-b"]);
  expect(params.getAll("color")).toEqual(["#b26782", "#827eae"]);
  expect(params.has("weight_mobility")).toBe(true);
  await user.click(screen.getByRole("button", { name: "Очистити" }));
  expect(screen.queryByText("0/3")).toBeNull();
  expect(screen.queryByRole("table")).toBeNull();
  expect(screen.getByRole("heading", { name: "Порівняти гексагони" })).toBeTruthy();
});

it("restores the selected assessment after toggling the assistant twice", async () =>
{
  const user = setup();
  await user.click(screen.getByRole("button", { name: "Вибрати тестову ділянку" }));
  await screen.findByText("94", { selector: ".score-value" });
  await user.click(screen.getByRole("button", { name: "Помічник Окіл" }));
  expect(screen.getByLabelText("Твоє запитання")).toBeTruthy();
  expect(screen.queryByText("Про цей гексагон: 94/100")).toBeNull();
  expect(screen.getByText("94", { selector: ".score-value" }).closest("[hidden]")).toBeNull();
  await user.click(screen.getByRole("button", { name: "Помічник Окіл" }));
  expect(screen.queryByRole("textbox", { name: "Твоє запитання" })).toBeNull();
  expect(screen.getByText("94", { selector: ".score-value" }).closest("[hidden]")).toBeNull();
});

it("grows the composer with text and shrinks it after clearing", async () =>
{
  const user = setup();
  await user.click(screen.getByRole("button", { name: "Помічник Окіл" }));
  const input = screen.getByLabelText("Твоє запитання") as HTMLTextAreaElement;
  let height = 78;
  Object.defineProperty(input, "scrollHeight", { configurable: true, get: () => height });
  await user.type(input, "Кілька рядків");
  expect(input.style.height).toBe("78px");
  height = 200;
  await user.type(input, " і довше запитання");
  expect(input.style.height).toBe("128px");
  expect(input.style.overflowY).toBe("auto");
  height = 30;
  await user.clear(input);
  expect(input.style.height).toBe("32px");
  expect(input.style.overflowY).toBe("hidden");
});

it.each(["Пріоритети", "Відкрити маршрути зупинки"])("keeps the left panel open when opening the assistant from %s", async (name) =>
{
  const user = setup();
  await user.click(screen.getByRole("button", { name }));
  const panel = document.getElementById("weights-panel");
  expect(panel).not.toBeNull();
  const routesOpen = panel?.classList.contains("is-stop");
  await user.click(screen.getByRole("button", { name: "Помічник Окіл" }));
  expect(document.getElementById("weights-panel")).toBe(panel);
  expect(panel?.classList.contains("is-stop")).toBe(routesOpen);
  expect(screen.getByLabelText("Твоє запитання")).toBeTruthy();
});

it("hides the legend and zoom controls only while categories or chat are open", async () =>
{
  const user = setup();
  const map = document.getElementById("map")!;
  const legend = map.querySelector<HTMLElement>(".map-legend")!;
  const check = (hidden: boolean) =>
  {
    expect(legend.hidden).toBe(hidden);
    expect(map.classList.contains("map-details-open")).toBe(hidden);
  };
  check(false);
  await user.click(screen.getByRole("button", { name: "Вибрати тестову ділянку" }));
  await screen.findByText("94", { selector: ".score-value" });
  check(false);
  await user.click(screen.getByRole("button", { name: "Категорії" }));
  check(true);
  await user.click(screen.getByRole("button", { name: "Категорії" }));
  check(false);
  await user.click(screen.getByRole("button", { name: "Помічник Окіл" }));
  check(true);
  await user.click(screen.getByRole("button", { name: "Помічник Окіл" }));
  check(false);
  await user.click(screen.getByRole("button", { name: "Категорії" }));
  check(true);
  await user.click(screen.getByRole("button", { name: "Закрити оцінки" }));
  check(false);
});

it("switches between assessment, comparison, and chat without stacking panels", async () => {
  const user = setup();
  await user.click(screen.getByRole("button", { name: "Вибрати тестову ділянку" }));
  expect(screen.getByRole("heading", { name: "Оцінка гексагону" })).toBeTruthy();

  const compare = screen.getByRole("button", { name: "Порівняти ділянки" });
  const chat = screen.getByRole("button", { name: "Помічник Окіл" });
  await user.click(compare);
  expect(screen.queryByRole("heading", { name: "Оцінка гексагону" })).toBeNull();
  expect(screen.getByRole("heading", { name: "Порівняти гексагони" })).toBeTruthy();

  await user.click(chat);
  expect(screen.queryByRole("heading", { name: "Порівняти гексагони" })).toBeNull();
  expect(screen.getByRole("heading", { name: "Помічник Окіл" })).toBeTruthy();

  await user.click(compare);
  expect(screen.queryByRole("heading", { name: "Помічник Окіл" })).toBeNull();
  await user.click(screen.getByRole("button", { name: "Завершити порівняння" }));
  expect(screen.queryByRole("heading", { name: "Порівняти гексагони" })).toBeNull();
  expect(screen.getByRole("heading", { name: "Оцінка гексагону" })).toBeTruthy();
});

it("replaces only В when the map action is clicked after choosing a fourth hexagon", async () => {
  const user = setup();
  await user.click(screen.getByRole("button", { name: "Порівняти ділянки" }));
  for (const name of ["Вибрати тестову ділянку", "Вибрати іншу ділянку", "Вибрати третю ділянку"]) {
    await user.click(screen.getByRole("button", { name }));
    await user.click(screen.getByRole("button", { name: "Додати до порівняння" }));
  }

  await user.click(screen.getByRole("button", { name: "Вибрати четверту ділянку" }));
  expect(screen.getByText("3/3")).toBeTruthy();
  expect(screen.queryByText(/У порівнянні вже три ділянки/)).toBeNull();
  await user.click(screen.getByRole("button", { name: "Додати замість В" }));
  expect(screen.getByText("3/3")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Додати замість В" })).toBeNull();

  await user.click(screen.getByRole("button", { name: "Порівняти" }));
  const request = vi.mocked(fetch).mock.calls.find(([url]) =>
    new URL(String(url)).pathname === "/hexagons/compare",
  );
  expect(new URL(String(request?.[0])).searchParams.getAll("h3_id")).toEqual([
    "selected-hex", "selected-hex-b", "selected-hex-d",
  ]);
});
it("switches the route origin and shows every applied destination from that hexagon", async ({ onTestFinished }) => {
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  const dialog = HTMLDialogElement.prototype;
  const showModal = Object.getOwnPropertyDescriptor(dialog, "showModal");
  const close = Object.getOwnPropertyDescriptor(dialog, "close");
  Object.defineProperties(dialog, {
    showModal: { configurable: true, value(this: HTMLDialogElement) { this.open = true; } },
    close: { configurable: true, value(this: HTMLDialogElement) { this.open = false; } },
  });
  onTestFinished(() => {
    if (showModal) Object.defineProperty(dialog, "showModal", showModal);
    else Reflect.deleteProperty(dialog, "showModal");
    if (close) Object.defineProperty(dialog, "close", close);
    else Reflect.deleteProperty(dialog, "close");
  });
  client.setQueryDefaults(["hexagon-assessment"], { gcTime: 60_000 });
  let releaseSecondOrigin = () => {};
  const secondOriginGate = new Promise<void>((resolve) => {
    releaseSecondOrigin = resolve;
  });
  const fetchImplementation = vi.mocked(fetch).getMockImplementation()!;
  vi.mocked(fetch).mockImplementation(async (...args) => {
    const url = new URL(String(args[0]));
    const isDetail = /^\/hexagons\/selected-hex(?:-[bc])?$/.test(url.pathname);
    if (!isDetail || url.searchParams.getAll("anchor_lat").length !== 2) {
      return fetchImplementation(...args);
    }
    if (url.pathname.endsWith("-c")) throw new Error("Route unavailable");
    if (url.pathname.endsWith("-b")) await secondOriginGate;
    const origin = url.pathname.endsWith("-b") ? 25 : 24;
    return Response.json({
      h3_id: url.pathname.split("/").at(-1),
      overall_rating: 94,
      categories: [],
      routes: {
        type: "FeatureCollection",
        features: [0, 1].map((index) => ({
          type: "Feature",
          properties: { anchor_index: index, color: "#31523e" },
          geometry: { type: "LineString", coordinates: [[origin, index], [24, 49]] },
        })),
      },
    });
  });

  const user = setup();
  await user.click(screen.getByRole("button", { name: "Пріоритети" }));
  await user.click(screen.getByRole("button", { name: "Обрати" }));
  await user.click(screen.getByRole("button", { name: /Студент НУ/ }));
  await user.click(screen.getByRole("button", { name: "Використати набір" }));
  await user.click(screen.getByRole("button", { name: "Застосувати" }));
  await user.click(screen.getByRole("button", { name: "Вибрати тестову ділянку" }));
  await screen.findByTestId("map-route-coordinates");
  await user.click(screen.getByRole("button", { name: "Порівняти ділянки" }));
  expect(screen.queryByTestId("map-route-coordinates")).toBeNull();
  for (const name of ["Вибрати тестову ділянку", "Вибрати іншу ділянку", "Вибрати третю ділянку"]) {
    await user.click(screen.getByRole("button", { name }));
    await user.click(screen.getByRole("button", { name: "Додати до порівняння" }));
  }

  expect(screen.queryByTestId("map-route-coordinates")).toBeNull();
  await user.click(screen.getByRole("button", { name: "Порівняти" }));
  const firstOrigin = screen.getByRole("button", { name: "Маршрути з гексагону А" });
  expect(firstOrigin.getAttribute("aria-pressed")).toBe("false");
  expect(screen.queryByTestId("map-route-coordinates")).toBeNull();
  await waitFor(() => expect((firstOrigin as HTMLButtonElement).disabled).toBe(false));
  await user.click(firstOrigin);
  expect((await screen.findByTestId("map-route-coordinates")).textContent).toBe("24,0;24,1");
  const secondOrigin = screen.getByRole("button", { name: "Маршрути з гексагону Б" });
  await user.click(secondOrigin);
  expect(secondOrigin.getAttribute("aria-pressed")).toBe("true");
  expect(secondOrigin.getAttribute("aria-busy")).toBe("true");
  expect(secondOrigin.querySelector("[data-slot=skeleton]")).toBeNull();
  for (const origin of screen.getAllByRole("button", { name: /Маршрути з гексагону/ })) {
    expect((origin as HTMLButtonElement).disabled).toBe(true);
  }
  releaseSecondOrigin();
  expect((await screen.findByText("25,0;25,1")).textContent).toBe("25,0;25,1");
  await user.click(screen.getByRole("button", { name: "Маршрути з гексагону В" }));
  expect(await screen.findByRole("button", { name: "Не вдалося побудувати маршрут" })).toBeTruthy();
  expect(screen.queryByTestId("map-route-coordinates")).toBeNull();

  const requestsBeforeReturning = vi.mocked(fetch).mock.calls.length;
  await user.click(firstOrigin);
  expect(firstOrigin.getAttribute("aria-busy")).toBe("false");
  expect(screen.getByTestId("map-route-coordinates").textContent).toBe("24,0;24,1");
  expect(screen.queryByRole("button", { name: "Не вдалося побудувати маршрут" })).toBeNull();
  expect(vi.mocked(fetch).mock.calls).toHaveLength(requestsBeforeReturning);
  await user.click(firstOrigin);
  expect(firstOrigin.getAttribute("aria-pressed")).toBe("false");
  expect(screen.queryByTestId("map-route-coordinates")).toBeNull();
  await user.click(firstOrigin);
  expect(screen.getByTestId("map-route-coordinates").textContent).toBe("24,0;24,1");
  await user.click(screen.getByRole("button", { name: "Згорнути" }));
  expect(screen.queryByTestId("map-route-coordinates")).toBeNull();
});