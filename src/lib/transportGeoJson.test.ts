// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { createElement, type PropsWithChildren } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { groupStopRoutes } from "./stopRoutes";
import { useRoutesByHex } from "./useRoutesByHex";
import { stopsInsideHex, useStopsByHex } from "./useStopsByHex";

const hexId = "891f2242c0fffff";
const route = {
  type: "Feature",
  properties: {
    id: 7,
    name: "А08а — Підвальна",
    number: "А08а",
    direction: "Підвальна",
    geometry_source: "segments",
  },
  geometry: {
    type: "LineString",
    coordinates: [
      [24.0316, 49.8429],
      [24.0305, 49.8433],
    ],
  },
};
const stop = {
  type: "Feature",
  properties: {
    id: 17,
    name: "Підвальна (59)",
    in_hex: true,
    routes: [
      { id: 4, number: "Тр23", direction: null },
      { id: 8, number: "А16", direction: "Підвальна" },
      { id: 6, number: "А08а", direction: "Підвальна" },
      { id: 7, number: "А08а", direction: "Вокзал" },
    ],
  },
  geometry: { type: "Point", coordinates: [24.0316, 49.8429] },
};

function collection(...features: unknown[]) {
  return { type: "FeatureCollection", features };
}

let client: QueryClient;
const request = vi.fn<typeof fetch>();

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.stubEnv("VITE_BACKEND_URL", "https://api.example.test/");
  vi.stubGlobal("fetch", request);
});

afterEach(() => {
  cleanup();
  client.clear();
  request.mockReset();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function QueryWrapper({ children }: PropsWithChildren) {
  return createElement(QueryClientProvider, { client }, children);
}

describe.each([
  { path: "/routes/geojson", useTransport: useRoutesByHex },
  { path: "/routes/stops/geojson", useTransport: useStopsByHex },
])("$path API contract", ({ path, useTransport }) => {
  it("encodes the H3 filter as a single query parameter and accepts empty collections", async () => {
    request.mockResolvedValueOnce(Response.json(collection()));

    const { result } = renderHook(() => useTransport(`${hexId}&extra=1`), {
      wrapper: QueryWrapper,
    });
    await waitFor(() => expect(result.current.data).toEqual(collection()));
    expect(request).toHaveBeenCalledExactlyOnceWith(
      `https://api.example.test${path}?h3_id=${hexId}%26extra%3D1`,
      undefined,
    );
  });

  it("reports malformed JSON as a query error", async () => {
    request.mockResolvedValueOnce(
      new Response('{"type":"FeatureCollection","features":', {
        headers: { "content-type": "application/json" },
      }),
    );

    const { result } = renderHook(() => useTransport(hexId), {
      wrapper: QueryWrapper,
    });
    await waitFor(() =>
      expect(result.current.error).toMatchObject({ name: "SyntaxError" }),
    );
    expect(result.current.data).toBeUndefined();
  });

  it("preserves the backend status for an invalid H3 filter", async () => {
    request.mockResolvedValueOnce(
      Response.json({ detail: "Invalid h3_id" }, { status: 400 }),
    );
    const { result } = renderHook(() => useTransport("invalid"), {
      wrapper: QueryWrapper,
    });
    await waitFor(() =>
      expect(result.current.error).toMatchObject({ status: 400 }),
    );
  });

  it("does not fetch without a selected hexagon", () => {
    const { result } = renderHook(() => useTransport(null), {
      wrapper: QueryWrapper,
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(request).not.toHaveBeenCalled();
  });
});

it("keeps route lines from segments and from the stop-coordinate fallback", async () => {
  const fallback = {
    ...route,
    properties: {
      ...route.properties,
      id: 8,
      direction: null,
      geometry_source: "stops",
    },
  };
  request.mockResolvedValueOnce(Response.json(collection(route, fallback)));

  const { result } = renderHook(() => useRoutesByHex(hexId), {
    wrapper: QueryWrapper,
  });
  await waitFor(() =>
    expect(result.current.data).toEqual(collection(route, fallback)),
  );
});

it("selects stops inside the hexagon and prepares their labels and route groups", async () => {
  const unnamed = {
    ...stop,
    properties: { ...stop.properties, id: 18, name: null, routes: [] },
  };
  const missingName = {
    ...stop,
    properties: { id: 19, in_hex: true, routes: [] },
  };
  const outside = {
    ...stop,
    properties: { ...stop.properties, id: 20, in_hex: false },
  };
  request.mockResolvedValueOnce(
    Response.json(collection(stop, unnamed, missingName, outside)),
  );

  const { result } = renderHook(() => useStopsByHex(hexId), {
    wrapper: QueryWrapper,
  });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  const stops = result.current.data;
  const visible = stopsInsideHex(stops);
  expect(visible).toEqual(
    collection(
      {
        ...stop,
        properties: { ...stop.properties, name: "Підвальна" },
      },
      unnamed,
      { ...missingName, properties: { ...missingName.properties, name: null } },
    ),
  );
  expect(stops?.features[0].properties.name).toBe("Підвальна (59)");
  expect(groupStopRoutes(visible.features[0].properties.routes)).toEqual([
    { kind: "bus", label: "Автобус", plates: ["8а", "16"] },
    { kind: "trolley", label: "Тролейбус", plates: ["23"] },
  ]);
  expect(groupStopRoutes(visible.features[1].properties.routes)).toEqual([]);
  expect(stopsInsideHex(undefined)).toEqual(collection());
});
