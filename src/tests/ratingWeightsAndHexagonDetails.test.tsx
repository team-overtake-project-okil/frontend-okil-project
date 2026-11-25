// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Map as OkilMap } from "../components/map";
import type {
  HexagonAssessment,
  HexagonRoutes,
} from "../lib/hexagonAssessment";
import type { HexStopProperties } from "../lib/useStopsByHex";

const PRIMARY_HEX_ID = "891e76883c3ffff";
const SECONDARY_HEX_ID = "891e76883afffff";

const SAMPLE_ROUTES: HexagonRoutes = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        transport_mode: "tram",
        mode: "transit",
        section_type: "transit",
        route_index: 0,
        section_index: 0,
        color: "#2b6cb0",
        line_style: "solid",
        route_number: "8",
        label: "Трамвай 8",
        headsign: "пл. Соборна",
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [24.0311, 49.8397],
          [24.0352, 49.8421],
        ],
      },
    },
  ],
};

const SAMPLE_STOP: HexStopProperties = {
  id: 501,
  name: "пл. Ринок",
  in_hex: true,
  routes: [
    { id: 1, number: "1", direction: "Залізничний вокзал" },
    { id: 2, number: "8", direction: "Сихів" },
    { id: 3, number: "46", direction: "просп. Червоної Калини" },
  ],
};

// Mock only the WebGL canvas; keep real Map state, controls, React Query hooks and fetcher.
vi.mock("../components/MapboxMap", () => ({
  MapboxMap: ({
    hexagons,
    selectedHexId,
    assessmentRoutes,
    onHexSelect,
    onStopInPanel,
  }: {
    hexagons: { h3_id: string; overall_rating: number }[];
    selectedHexId: string | null;
    assessmentRoutes: HexagonRoutes | null;
    onHexSelect: (id: string | null) => void;
    onStopInPanel: (stop: HexStopProperties) => void;
  }) => (
    <div
      data-testid="map-layer"
      data-ratings={JSON.stringify(hexagons)}
      data-selected-hex={selectedHexId ?? ""}
      data-routes={JSON.stringify(assessmentRoutes)}
    >
      <button type="button" onClick={() => onHexSelect("891e76883c3ffff")}>
        Select primary hex
      </button>
      <button type="button" onClick={() => onHexSelect(null)}>
        Clear selected hex
      </button>
      <button
        type="button"
        onClick={() =>
          onStopInPanel({
            id: 501,
            name: "пл. Ринок",
            in_hex: true,
            routes: [
              { id: 1, number: "1", direction: "Залізничний вокзал" },
              { id: 2, number: "8", direction: "Сихів" },
              { id: 3, number: "46", direction: "просп. Червоної Калини" },
            ],
          })
        }
      >
        Select hex stop
      </button>
    </div>
  ),
}));

function buildAssessment(
  overrides: Partial<HexagonAssessment> = {},
): HexagonAssessment {
  return {
    h3_id: PRIMARY_HEX_ID,
    overall_rating: 84.7,
    categories: [
      {
        category: "mobility",
        score: 95,
        enabled: true,
        weight: 1,
        adjusted_score: 95,
        explanation: "Поруч зупинки трамваїв та автобусів у межах 200 м.",
      },
      {
        category: "daily",
        score: 74,
        enabled: true,
        weight: 1,
        adjusted_score: 74,
        explanation: "Є аптеки та супермаркети в пішій доступності.",
      },
      {
        category: "health",
        score: 92,
        enabled: true,
        weight: 1,
        adjusted_score: 92,
        explanation: "Поліклініка та стоматології в межах 400 м.",
      },
      {
        category: "study",
        score: 82,
        enabled: true,
        weight: 1,
        adjusted_score: 82,
        explanation: "Школа й садок у межах 500 м.",
      },
      {
        category: "enjoyment",
        score: 81,
        enabled: true,
        weight: 1,
        adjusted_score: 81,
        explanation: "Парк і заклади культури неподалік.",
      },
      {
        category: "sport",
        score: 68,
        enabled: false,
        weight: 0,
        adjusted_score: null,
        explanation: "Категорію вимкнено користувачем.",
      },
      {
        category: "security",
        score: 75,
        enabled: true,
        weight: 1,
        adjusted_score: 75,
        explanation: "Найближче укриття за 120 м.",
      },
      // "food" intentionally omitted to test missing-category rendering ("Немає даних")
    ],
    routes: SAMPLE_ROUTES,
    ...overrides,
  };
}

function getCategorySlider(title: string): HTMLInputElement {
  const group = screen.getByRole("group", { name: `Важливість: ${title}` });
  return within(group).getAllByRole<HTMLInputElement>("slider", {
    hidden: true,
  })[0];
}
function getRequestsByPath(
  fetchMock: ReturnType<typeof vi.fn<typeof fetch>>,
  pathname: string,
): URL[] {
  return fetchMock.mock.calls
    .map((call) => new URL(String(call[0])))
    .filter((url) => url.pathname === pathname);
}

let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;
let client: QueryClient;

beforeEach(() => {
  vi.stubGlobal("PointerEvent", MouseEvent);
  vi.stubGlobal("scrollTo", vi.fn());
  vi.stubEnv("VITE_BACKEND_URL", "https://ratings.example.test");
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  fetchMock = vi.fn<typeof fetch>();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  client.clear();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function renderMap() {
  return render(
    <QueryClientProvider client={client}>
      <OkilMap
        searchedLocation={null}
        onAddressChange={vi.fn()}
        clearSelectionKey={0}
      />
    </QueryClientProvider>,
  );
}

describe("rating weights & hexagon details API integration", () => {
  it("dispatches GET /hexagons and GET /hexagons/:id with updated weight params when sliders change and recalculates scores", async () => {
    const initialRatings = [
      { h3_id: PRIMARY_HEX_ID, overall_rating: 70.9 },
      { h3_id: SECONDARY_HEX_ID, overall_rating: 62.1 },
    ];
    const recalculatedRatings = [
      { h3_id: PRIMARY_HEX_ID, overall_rating: 89.8 },
      { h3_id: SECONDARY_HEX_ID, overall_rating: 55.4 },
    ];

    fetchMock.mockImplementation(async (input) => {
      const url = new URL(String(input));
      if (url.pathname === "/hexagons") {
        const isWeighted = url.searchParams.get("weight_health") === "4";
        return Response.json(isWeighted ? recalculatedRatings : initialRatings);
      }
      if (url.pathname === `/hexagons/${PRIMARY_HEX_ID}`) {
        const isWeighted = url.searchParams.get("weight_health") === "4";
        return Response.json(
          buildAssessment({
            overall_rating: isWeighted ? 89.8 : 70.9,
          }),
        );
      }
      throw new Error(`Unexpected request: ${url.toString()}`);
    });

    const user = userEvent.setup();
    renderMap();

    await waitFor(() =>
      expect(screen.getByTestId("map-layer").getAttribute("data-ratings")).toBe(
        JSON.stringify([
          { h3_id: PRIMARY_HEX_ID, overall_rating: 70 },
          { h3_id: SECONDARY_HEX_ID, overall_rating: 62 },
        ]),
      ),
    );

    // Select a hexagon first so we verify both map ratings and selected details recalculate together.
    await user.click(screen.getByRole("button", { name: "Select primary hex" }));
    expect(await screen.findByText("70")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Пріоритети" }));
    expect(screen.getByText("Пріоритети застосовано")).toBeTruthy();

    // Adjust sliders for Здоров'я (80 -> weight 4) and Освіта (60 -> weight 3), disable Спорт (weight 0).
    const healthSlider = getCategorySlider("Здоров'я");
    const studySlider = getCategorySlider("Освіта");
    fireEvent.change(healthSlider, { target: { value: "80" } });
    fireEvent.change(studySlider, { target: { value: "60" } });
    await user.click(screen.getByRole("switch", { name: "Спорт" }));

    expect(screen.getByText("Є незастосовані зміни")).toBeTruthy();
    // Draft edits must not trigger requests until Apply is clicked.
    expect(getRequestsByPath(fetchMock, "/hexagons")).toHaveLength(1);
    expect(
      getRequestsByPath(fetchMock, `/hexagons/${PRIMARY_HEX_ID}`),
    ).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Застосувати" }));

    await waitFor(() =>
      expect(screen.getByTestId("map-layer").getAttribute("data-ratings")).toBe(
        JSON.stringify([
          { h3_id: PRIMARY_HEX_ID, overall_rating: 89 },
          { h3_id: SECONDARY_HEX_ID, overall_rating: 55 },
        ]),
      ),
    );
    expect(await screen.findByText("89")).toBeTruthy();
    expect(screen.getByText("Пріоритети застосовано")).toBeTruthy();

    const hexListRequests = getRequestsByPath(fetchMock, "/hexagons");
    expect(hexListRequests).toHaveLength(2);
    const weightedListUrl = hexListRequests[1];
    expect(weightedListUrl.searchParams.get("weight_health")).toBe("4");
    expect(weightedListUrl.searchParams.get("weight_study")).toBe("3");
    expect(weightedListUrl.searchParams.get("weight_sport")).toBe("0");
    expect(weightedListUrl.searchParams.get("weight_mobility")).toBe("1");
    expect(weightedListUrl.searchParams.get("weight_security")).toBe("1");

    const detailRequests = getRequestsByPath(
      fetchMock,
      `/hexagons/${PRIMARY_HEX_ID}`,
    );
    expect(detailRequests).toHaveLength(2);
    expect(detailRequests[1].searchParams.get("weight_health")).toBe("4");
    expect(detailRequests[1].searchParams.get("weight_study")).toBe("3");
    expect(detailRequests[1].searchParams.get("weight_sport")).toBe("0");

    // Resetting restores default weights after applying.
    await user.click(screen.getByRole("button", { name: "Скинути" }));
    expect(screen.getByText("Є незастосовані зміни")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Застосувати" }));

    await waitFor(() =>
      expect(getRequestsByPath(fetchMock, "/hexagons")).toHaveLength(3),
    );
    const resetUrl = getRequestsByPath(fetchMock, "/hexagons")[2];
    expect(resetUrl.searchParams.get("weight_health")).toBe("1");
    expect(resetUrl.searchParams.get("weight_study")).toBe("1");
    expect(resetUrl.searchParams.get("weight_sport")).toBe("1");
    await waitFor(() =>
      expect(screen.getByTestId("map-layer").getAttribute("data-ratings")).toBe(
        JSON.stringify([
          { h3_id: PRIMARY_HEX_ID, overall_rating: 70 },
          { h3_id: SECONDARY_HEX_ID, overall_rating: 62 },
        ]),
      ),
    );
  });

  it("fetches and renders detailed category breakdowns, explanations and associated route info on hexagon selection", async () => {
    const assessment = buildAssessment();
    fetchMock.mockImplementation(async (input) => {
      const url = new URL(String(input));
      if (url.pathname === "/hexagons") {
        return Response.json([{ h3_id: PRIMARY_HEX_ID, overall_rating: 84.7 }]);
      }
      if (url.pathname === `/hexagons/${PRIMARY_HEX_ID}`) {
        return Response.json(assessment);
      }
      throw new Error(`Unexpected request: ${url.toString()}`);
    });

    const user = userEvent.setup();
    renderMap();

    await waitFor(() =>
      expect(screen.getByTestId("map-layer").getAttribute("data-ratings")).toBe(
        JSON.stringify([{ h3_id: PRIMARY_HEX_ID, overall_rating: 84 }]),
      ),
    );

    await user.click(screen.getByRole("button", { name: "Select primary hex" }));

    // Overall truncated rating and routes GeoJSON forwarded to map layer
    expect(await screen.findByText("84")).toBeTruthy();
    expect(screen.getByTestId("map-layer").getAttribute("data-selected-hex")).toBe(
      PRIMARY_HEX_ID,
    );
    expect(screen.getByTestId("map-layer").getAttribute("data-routes")).toBe(
      JSON.stringify(SAMPLE_ROUTES),
    );

    // Open detailed category breakdown
    await user.click(screen.getByRole("button", { name: "Категорії" }));

    const healthToggle = screen.getByRole("button", {
      name: "Пояснення: Здоров'я",
    });
    expect(healthToggle.textContent).toContain("92");
    expect(
      screen.getByLabelText("Здоров'я", { selector: "meter" }).getAttribute("value"),
    ).toBe("92");

    const mobilityToggle = screen.getByRole("button", {
      name: "Пояснення: Мобільність",
    });
    expect(mobilityToggle.textContent).toContain("95");

    const sportToggle = screen.getByRole("button", {
      name: "Пояснення: Спорт",
    });
    expect(sportToggle.textContent).toContain("Вимкнено");
    expect(
      screen.getByLabelText("Спорт", { selector: "meter" }).getAttribute("value"),
    ).toBe("0");

    const foodToggle = screen.getByRole("button", { name: "Пояснення: Їжа" });
    expect(foodToggle.textContent).toContain("Немає даних");

    // Expand category explanation and verify backend text
    await user.click(healthToggle);
    expect(healthToggle.getAttribute("aria-expanded")).toBe("true");
    expect(
      screen.getByText("Поліклініка та стоматології в межах 400 м."),
    ).toBeTruthy();

    await user.click(sportToggle);
    expect(sportToggle.getAttribute("aria-expanded")).toBe("true");
    expect(
      screen.getByText("Не враховується в загальній оцінці."),
    ).toBeTruthy();

    // Verify associated stop routes panel opens with stop name & routes
    await user.click(screen.getByRole("button", { name: "Select hex stop" }));
    expect(await screen.findByText(SAMPLE_STOP.name!)).toBeTruthy();
    expect(screen.getByText("1")).toBeTruthy();
    expect(screen.getByText("8")).toBeTruthy();
    expect(screen.getByText("46")).toBeTruthy();
  });

  it("renders empty state when no hexagon is selected and proper loading states while waiting for API responses", async () => {
    let resolveInitialHexagons!: (response: Response) => void;
    let resolveDetails!: (response: Response) => void;
    let resolveRefetch!: (response: Response) => void;
    let hexagonsCallCount = 0;

    fetchMock.mockImplementation((input) => {
      const url = new URL(String(input));
      if (url.pathname === "/hexagons") {
        hexagonsCallCount += 1;
        if (hexagonsCallCount === 1) {
          return new Promise<Response>((resolve) => {
            resolveInitialHexagons = resolve;
          });
        }
        return new Promise<Response>((resolve) => {
          resolveRefetch = resolve;
        });
      }
      if (url.pathname === `/hexagons/${PRIMARY_HEX_ID}`) {
        return new Promise<Response>((resolve) => {
          resolveDetails = resolve;
        });
      }
      throw new Error(`Unexpected request: ${url.toString()}`);
    });

    const user = userEvent.setup();
    renderMap();

    // 1. Initial GET /hexagons loading state + no hexagon selected
    expect(screen.getByRole("status").textContent).toContain(
      "Завантажуємо оцінки…",
    );
    expect(screen.queryByRole("button", { name: "Категорії" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Запитати за цей гексагон" }),
    ).toBeNull();
    expect(
      getRequestsByPath(fetchMock, `/hexagons/${PRIMARY_HEX_ID}`),
    ).toHaveLength(0);
    expect(screen.getByTestId("map-layer").getAttribute("data-selected-hex")).toBe(
      "",
    );
    expect(screen.getByTestId("map-layer").getAttribute("data-routes")).toBe(
      "null",
    );

    await act(async () => {
      resolveInitialHexagons(
        Response.json([{ h3_id: PRIMARY_HEX_ID, overall_rating: 76 }]),
      );
    });

    await waitFor(() =>
      expect(screen.queryByText("Завантажуємо оцінки…")).toBeNull(),
    );
    expect(screen.getByTestId("map-layer").getAttribute("data-ratings")).toBe(
      JSON.stringify([{ h3_id: PRIMARY_HEX_ID, overall_rating: 76 }]),
    );
    // Still empty state before any hexagon is clicked
    expect(screen.queryByRole("button", { name: "Категорії" })).toBeNull();

    // 2. Click a hexagon -> loading skeleton while GET /hexagons/:id is pending
    await user.click(screen.getByRole("button", { name: "Select primary hex" }));
    expect(
      screen.getByRole("status", { name: "Завантаження оцінки" }),
    ).toBeTruthy();
    expect(
      (
        screen.getByRole("button", {
          name: "Запитати за цей гексагон",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);

    await user.click(screen.getByRole("button", { name: "Категорії" }));
    expect(
      screen.getByRole("status", { name: "Завантаження категорій" }),
    ).toBeTruthy();

    await act(async () => {
      resolveDetails(Response.json(buildAssessment({ overall_rating: 84.2 })));
    });

    await waitFor(() =>
      expect(
        screen.queryByRole("status", { name: "Завантаження оцінки" }),
      ).toBeNull(),
    );
    expect(
      screen.queryByRole("status", { name: "Завантаження категорій" }),
    ).toBeNull();
    expect(screen.getByText("84")).toBeTruthy();

    // 3. Clearing selection returns UI to the empty state
    await user.click(screen.getByRole("button", { name: "Clear selected hex" }));
    expect(screen.queryByRole("button", { name: "Категорії" })).toBeNull();
    expect(screen.queryByText("84")).toBeNull();
    expect(screen.getByTestId("map-layer").getAttribute("data-selected-hex")).toBe(
      "",
    );

    // 4. Updating state while new weights are fetching retains previous map data
    await user.click(screen.getByRole("button", { name: "Пріоритети" }));
    fireEvent.change(getCategorySlider("Здоров'я"), { target: { value: "100" } });
    await user.click(screen.getByRole("button", { name: "Застосувати" }));

    expect(await screen.findByText("Оновлюємо оцінки…")).toBeTruthy();
    expect(screen.getByTestId("map-layer").getAttribute("data-ratings")).toBe(
      JSON.stringify([{ h3_id: PRIMARY_HEX_ID, overall_rating: 76 }]),
    );

    await act(async () => {
      resolveRefetch(
        Response.json([{ h3_id: PRIMARY_HEX_ID, overall_rating: 91 }]),
      );
    });

    await waitFor(() =>
      expect(screen.queryByText("Оновлюємо оцінки…")).toBeNull(),
    );
    expect(screen.getByTestId("map-layer").getAttribute("data-ratings")).toBe(
      JSON.stringify([{ h3_id: PRIMARY_HEX_ID, overall_rating: 91 }]),
    );
  });
});