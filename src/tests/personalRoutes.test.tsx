// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { useMapRatings } from "../lib/useMapRatings";

let client: QueryClient;
afterEach(() => {
  cleanup();
  client.clear();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it("opts into personal trips only after a place is added, and retains places while disabled", async () => {
  vi.stubEnv("VITE_BACKEND_URL", "https://ratings.example.test");
  const request = vi
    .fn<typeof fetch>()
    .mockImplementation(async () => Response.json([]));
  vi.stubGlobal("fetch", request);
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useMapRatings(null), { wrapper });
  await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
  const lastQuery = () =>
    new URL(String(request.mock.calls.at(-1)![0])).searchParams;
  expect(result.current.personalRoutesEnabled).toBe(false);
  expect(result.current.anchors).toEqual([]);
  expect(result.current.dirty).toBe(false);
  expect(lastQuery().get("weight_mobility")).toBe("0");
  expect(lastQuery().has("anchor_lat")).toBe(false);

  act(() => result.current.setPersonalRoutesEnabled(true));
  expect(result.current.canApply).toBe(false);
  act(() => result.current.handleApply());
  expect(request).toHaveBeenCalledTimes(1);
  act(() =>
    result.current.saveAnchor({
      id: "work",
      label: "Робота",
      lat: 49.845,
      lng: 24.025,
      source: "map",
    }),
  );
  expect(result.current.canApply).toBe(true);
  act(() => result.current.handleApply());
  await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
  expect(lastQuery().get("anchor_lat")).toBe("49.845");
  expect(lastQuery().get("weight_mobility")).toBe("1");
  expect(result.current.dirty).toBe(false);

  act(() => result.current.setPersonalRoutesEnabled(false));
  act(() => result.current.handleApply());
  await waitFor(() => expect(request).toHaveBeenCalledTimes(3));
  expect(lastQuery().has("anchor_lat")).toBe(false);
  expect(lastQuery().get("weight_mobility")).toBe("0");
  expect(result.current.anchors[0].label).toBe("Робота");
  expect(result.current.appliedAnchors).toEqual([]);

  act(() => result.current.setPersonalRoutesEnabled(true));
  act(() => result.current.handleApply());
  await waitFor(() => expect(result.current.appliedAnchors).toHaveLength(1));
  act(() => result.current.removeAnchor("work"));
  expect(result.current.anchors).toEqual([]);
  expect(result.current.canApply).toBe(false);
  act(() => result.current.handleReset());
  expect(result.current.personalRoutesEnabled).toBe(false);
  expect(result.current.canApply).toBe(true);
});

it("loads editable presets, retains their points in custom mode, and sends only the selected set", async () => {
  vi.stubEnv("VITE_BACKEND_URL", "https://ratings.example.test");
  const request = vi
    .fn<typeof fetch>()
    .mockImplementation(async () => Response.json([]));
  vi.stubGlobal("fetch", request);
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useMapRatings(null), { wrapper });
  await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
  act(() => result.current.setPersonalRoutesEnabled(true));
  act(() => result.current.selectPreset("polytechnic"));
  expect(result.current.selectedPresetId).toBe("polytechnic");
  expect(result.current.anchors).toHaveLength(2);
  expect(result.current.presetModified).toBe(false);
  expect(request).toHaveBeenCalledTimes(1);
  const originalPoint = result.current.anchors[0];
  act(() =>
    result.current.saveAnchor({ ...originalPoint, label: "Мій корпус" }),
  );
  expect(result.current.presetModified).toBe(true);
  act(() => result.current.selectPreset("custom"));
  expect(result.current.anchors[0].label).toBe("Мій корпус");
  act(() => result.current.selectPreset("franko"));
  expect(result.current.anchors).toHaveLength(3);
  expect(
    result.current.anchors.every((point) =>
      point.id.startsWith("preset:franko:"),
    ),
  ).toBe(true);
  act(() => result.current.handleApply());
  await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
  const query = new URL(String(request.mock.calls.at(-1)![0])).searchParams;
  expect(query.getAll("anchor_lat")).toEqual(
    result.current.anchors.map((point) => String(point.lat)),
  );
  act(() => result.current.setPersonalRoutesEnabled(false));
  expect(result.current.selectedPresetId).toBe("franko");
  act(() => result.current.handleReset());
  expect(result.current.selectedPresetId).toBeNull();
});
