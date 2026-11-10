// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AddressSearch } from "../components/AddressSearch";
import { clearAddressRequestCache } from "../services/addressRequests";

const address = "просп. В'ячеслава Чорновола, 13";
const result = {
  street: "проспект В'ячеслава Чорновола",
  housenumber: "13",
  city: "Львів",
  lat: 49.846888,
  lon: 24.025258,
  place_id: "house-13",
};
let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;

beforeEach(() => {
  vi.useFakeTimers();
  clearAddressRequestCache();
  vi.stubEnv("VITE_VISICOM_API_KEY", "test-visicom");
  vi.stubEnv("VITE_GEOAPIFY_API_KEY", "test-geoapify");
  fetchMock = vi
    .fn<typeof fetch>()
    .mockImplementation(async (input) =>
      Response.json(
        String(input).includes("geoapify") ? { results: [result] } : {},
      ),
    );
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function enterAddress(value = "Чорновола 13") {
  const input = screen.getByRole("combobox");
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value } });
  return input;
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe("address search API integration", () => {
  it("debounces typing, sends provider parameters and confirms selected coordinates", async () => {
    const onLocationChange = vi.fn();
    render(<AddressSearch onLocationChange={onLocationChange} />);
    enterAddress("Чорновола 1");
    await advance(500);
    enterAddress();
    await advance(699);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toBe("Пошук адрес…");
    await advance(1);
    const visicom = new URL(String(fetchMock.mock.calls[0][0]));
    expect(visicom.pathname).toBe("/data-api/4.0/uk/search/adr_address.json");
    expect(visicom.searchParams.get("text")).toBe("чорновола 13*");
    expect(visicom.searchParams.get("intersect")).toBe("STL1NT7FL");
    await advance(600);
    const geoapify = new URL(String(fetchMock.mock.calls[1][0]));
    expect(geoapify.pathname).toBe("/v1/geocode/search");
    expect(geoapify.searchParams.get("text")).toBe("Чорновола, 13, Львів");
    expect(geoapify.searchParams.get("filter")).toContain(
      "countrycode:ua|rect:",
    );
    expect(screen.queryByRole("status")).toBeNull();
    expect(onLocationChange).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.click(screen.getByRole("option", { name: address }));
    });
    expect(onLocationChange).toHaveBeenCalledWith(
      expect.objectContaining({
        address,
        lat: result.lat,
        lng: result.lon,
        isComplete: true,
      }),
    );
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("shows an empty result for successful responses without matches", async () => {
    fetchMock.mockImplementation(async () => Response.json({}));
    render(<AddressSearch onLocationChange={vi.fn()} />);
    const input = enterAddress();
    await advance(1300);
    expect(screen.getByRole("status").textContent).toContain(
      "Адресу не знайдено",
    );
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(screen.queryByRole("option")).toBeNull();
  });

  it.each([404, 503])(
    "handles HTTP %s and allows a successful retry",
    async (status) => {
      fetchMock.mockImplementation(async () => new Response(null, { status }));
      const onLocationChange = vi.fn();
      render(<AddressSearch onLocationChange={onLocationChange} />);
      const input = enterAddress();
      await advance(1300);
      expect(screen.getByRole("alert").textContent).toContain(
        "Не вдалося виконати пошук",
      );
      expect(onLocationChange).not.toHaveBeenCalled();
      fetchMock.mockImplementation(async (url) =>
        Response.json(
          String(url).includes("geoapify") ? { results: [result] } : {},
        ),
      );
      fireEvent.submit(input.closest("form")!);
      await advance(600);
      expect(screen.queryByRole("alert")).toBeNull();
      expect(screen.getByRole("option", { name: address })).toBeTruthy();
    },
  );

  it("clearing an in-flight search aborts it and ignores a late response", async () => {
    let resolveResponse!: (response: Response) => void;
    fetchMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveResponse = resolve;
        }),
    );
    const onLocationChange = vi.fn();
    render(<AddressSearch onLocationChange={onLocationChange} />);
    const input = enterAddress("Чорно");
    await advance(700);
    const signal = fetchMock.mock.calls[0][1]?.signal;
    fireEvent.click(screen.getByRole("button", { name: "Очистити адресу" }));
    expect(signal?.aborted).toBe(true);
    await act(async () => {
      resolveResponse(Response.json({}));
    });
    expect((input as HTMLInputElement).value).toBe("");
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(onLocationChange).toHaveBeenCalledWith(null);
  });
});
