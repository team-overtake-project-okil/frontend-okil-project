import { afterEach, describe, expect, it, vi } from "vitest";
import { fetcher } from "../lib/fetcher";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe("API configuration", () => {
  it("requires VITE_BACKEND_URL even when a legacy URL is set", async () => {
    vi.stubEnv("VITE_BACKEND_URL", undefined);
    vi.stubEnv("VITE_API_URL", "https://legacy.example.test");
    const request = vi.fn();
    vi.stubGlobal("fetch", request);
    await expect(fetcher("/hexagons")).rejects.toThrow("Не налаштовано");
    expect(request).not.toHaveBeenCalled();
  });
  it("prefers VITE_BACKEND_URL", async () => {
    vi.stubEnv("VITE_BACKEND_URL", "https://preferred.example.test");
    vi.stubEnv("VITE_API_URL", "https://old.example.test");
    const request = vi
      .fn()
      .mockResolvedValue(
        new Response("{}", { headers: { "content-type": "application/json" } }),
      );
    vi.stubGlobal("fetch", request);
    await fetcher("/hexagons");
    expect(request).toHaveBeenCalledWith(
      "https://preferred.example.test/hexagons",
      undefined,
    );
  });
  it("does not request an undefined URL", async () => {
    vi.stubEnv("VITE_BACKEND_URL", "");
    vi.stubEnv("VITE_API_URL", undefined);
    const request = vi.fn();
    vi.stubGlobal("fetch", request);
    await expect(fetcher("/hexagons")).rejects.toThrow("Не налаштовано");
    expect(request).not.toHaveBeenCalled();
  });
  it("reports HTML responses explicitly", async () => {
    vi.stubEnv("VITE_BACKEND_URL", "https://api.example.test");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response("<html/>", { headers: { "content-type": "text/html" } }),
        ),
    );
    await expect(fetcher("/hexagons")).rejects.toThrow("некоректну відповідь");
  });
});

it("sends debug requests directly to VITE_BACKEND_URL", async () => {
  vi.stubEnv("VITE_BACKEND_URL", "https://public.example.test");
  vi.stubEnv("VITE_DEBUG_API_URL", "http://localhost:8000");
  const request = vi
    .fn()
    .mockResolvedValue(
      new Response("{}", { headers: { "content-type": "application/json" } }),
    );
  vi.stubGlobal("fetch", request);
  await fetcher("/debug/config", { headers: { Authorization: "Bearer test" } });
  expect(request).toHaveBeenCalledWith(
    "https://public.example.test/debug/config",
    {
      headers: { Authorization: "Bearer test" },
    },
  );
});
