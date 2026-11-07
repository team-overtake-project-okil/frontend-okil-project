// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Map } from "./map";

// WebGL rendering is outside this test; retain the real controls, queries and fetcher.
vi.mock("./MapboxMap", () => ({
  MapboxMap: ({ hexagons }: { hexagons: { h3_id: string }[] }) => (
    <div data-testid="map-data">
      {hexagons.map((hex) => hex.h3_id).join(",")}
    </div>
  ),
}));

let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;
let client: QueryClient;

beforeEach(() => {
  // jsdom 26 has no PointerEvent; Base UI dispatches pointer-based clicks.
  vi.stubGlobal("PointerEvent", MouseEvent);
  vi.stubEnv("VITE_BACKEND_URL", "https://ratings.example.test");
  fetchMock = vi
    .fn<typeof fetch>()
    .mockResolvedValue(
      Response.json([{ h3_id: "initial-hex", overall_rating: 70 }]),
    );
  vi.stubGlobal("fetch", fetchMock);
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
});

afterEach(() => {
  cleanup();
  client.clear();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

async function openPreferences() {
  const user = userEvent.setup();
  render(
    <QueryClientProvider client={client}>
      <Map
        searchedLocation={null}
        onAddressChange={vi.fn()}
        clearSelectionKey={0}
      />
    </QueryClientProvider>,
  );
  await waitFor(() =>
    expect(screen.getByTestId("map-data").textContent).toBe("initial-hex"),
  );
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(String(fetchMock.mock.calls[0][0])).toBe(
    "https://ratings.example.test/hexagons",
  );
  await user.click(screen.getByRole("button", { name: "Пріоритети" }));
  return user;
}

describe("category filter API integration", () => {
  it("shows an updating state and retains previous map data while filters load", async () => {
    const user = await openPreferences();
    let resolveResponse!: (response: Response) => void;
    fetchMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveResponse = resolve;
        }),
    );
    await user.click(screen.getByRole("switch", { name: "Освіта" }));
    await user.click(screen.getByRole("button", { name: "Застосувати" }));
    expect(await screen.findByText("Оновлюємо оцінки…")).toBeTruthy();
    expect(screen.getByTestId("map-data").textContent).toBe("initial-hex");
    await act(async () => {
      resolveResponse(Response.json([]));
    });
    await waitFor(() =>
      expect(screen.queryByText("Оновлюємо оцінки…")).toBeNull(),
    );
    expect(screen.getByTestId("map-data").textContent).toBe("");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it.each([
    ["Освіта", "weight_study"],
    ["Здоров'я", "weight_health"],
    ["Мобільність", "weight_mobility"],
    ["Щоденні потреби", "weight_daily"],
    ["Дозвілля", "weight_enjoyment"],
    ["Спорт", "weight_sport"],
    ["Їжа", "weight_food"],
  ])(
    "applies and restores the %s filter through the API",
    async (label, parameter) => {
      const user = await openPreferences();
      const toggle = screen.getByRole("switch", { name: label });
      expect(toggle.getAttribute("aria-checked")).toBe("true");
      await user.click(toggle);
      expect(toggle.getAttribute("aria-checked")).toBe("false");
      expect(fetchMock).toHaveBeenCalledTimes(1);
      fetchMock.mockImplementation(async () =>
        Response.json([{ h3_id: "filtered-hex", overall_rating: 80 }]),
      );
      await user.click(screen.getByRole("button", { name: "Застосувати" }));
      await waitFor(() =>
        expect(screen.getByTestId("map-data").textContent).toBe("filtered-hex"),
      );
      const params = new URL(String(fetchMock.mock.calls[1][0])).searchParams;
      expect(params.get(parameter)).toBe("0");
      expect(params.get("weight_security")).toBe("1");
      expect(
        [...params.entries()]
          .filter(([key]) => key !== parameter)
          .every(([, value]) => value === "1"),
      ).toBe(true);
      await user.click(toggle);
      await user.click(screen.getByRole("button", { name: "Застосувати" }));
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
      expect(
        new URL(String(fetchMock.mock.calls[2][0])).searchParams.get(parameter),
      ).toBe("1");
    },
  );

  it("keeps the map usable on an API error and retries the applied filters", async () => {
    const user = await openPreferences();
    await user.click(screen.getByRole("switch", { name: "Освіта" }));
    fetchMock.mockResolvedValue(new Response(null, { status: 503 }));
    await user.click(screen.getByRole("button", { name: "Застосувати" }));
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Не вдалося завантажити оцінки",
    );
    expect(screen.getByTestId("map-data")).toBeTruthy();
    expect(
      screen
        .getByRole("switch", { name: "Освіта" })
        .getAttribute("aria-checked"),
    ).toBe("false");
    fetchMock.mockImplementation(async () =>
      Response.json([{ h3_id: "recovered-hex", overall_rating: 60 }]),
    );
    await user.click(screen.getByRole("button", { name: "Спробувати знову" }));
    await waitFor(() =>
      expect(screen.getByTestId("map-data").textContent).toBe("recovered-hex"),
    );
    expect(screen.queryByRole("alert")).toBeNull();
    expect(
      new URL(String(fetchMock.mock.calls.at(-1)![0])).searchParams.get(
        "weight_study",
      ),
    ).toBe("0");
  });
});
