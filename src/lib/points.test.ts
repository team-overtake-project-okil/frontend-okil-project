import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, fetcher } from "./fetcher";

const point = {
  id: 17,
  type: "pharmacy",
  source: "osm",
  external_id: "1234",
  name: "Аптека",
  h3_id: "891f2242c0fffff",
  lat: 49.8429,
  lng: 24.0316,
};

function mockResponse(response: Response) {
  vi.stubEnv("VITE_BACKEND_URL", "https://api.example.test");
  const request = vi.fn<typeof fetch>().mockResolvedValue(response);
  vi.stubGlobal("fetch", request);
  return request;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("point detail API contract", () => {
  it("reads the point detail fields from a JSON response", async () => {
    const request = mockResponse(Response.json(point));

    await expect(fetcher("/points/17")).resolves.toEqual(point);
    expect(request).toHaveBeenCalledExactlyOnceWith(
      "https://api.example.test/points/17",
      undefined,
    );
  });

  it("keeps nullable point metadata", async () => {
    const unnamedPoint = { ...point, name: null, h3_id: null };
    mockResponse(Response.json(unnamedPoint));

    await expect(fetcher("/points/17")).resolves.toEqual(unnamedPoint);
  });

  it("rejects a malformed JSON response", async () => {
    mockResponse(
      new Response('{"id":', {
        headers: { "content-type": "application/json" },
      }),
    );

    await expect(fetcher("/points/17")).rejects.toBeInstanceOf(SyntaxError);
  });

  it("preserves the backend status when the point is missing", async () => {
    mockResponse(Response.json({ detail: "Point not found" }, { status: 404 }));

    const result = fetcher("/points/999");
    await expect(result).rejects.toBeInstanceOf(ApiError);
    await expect(result).rejects.toMatchObject({ status: 404 });
  });
});
