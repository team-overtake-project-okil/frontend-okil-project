import { clearAddressRequestCache } from "./addressRequests";
import { formatStreetLabel, formatHouseNumber } from "./addressFormat";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { getAddressParts } from "./addressValidation";
import { searchAddresses, geocodeAddressSuggestion } from "./geocoding";

beforeEach(() => clearAddressRequestCache());

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("address completeness", () => {
  it.each(["Бандери", "вулиця 8 Березня", "вул. 23", " "])("does not treat %s as a complete address", (query) => {
    expect(getAddressParts(query).houseNumber).toBeUndefined();
  });
  it.each([
    ["вул. Залізнична, 7П", "7П"], ["Бандери 12/1", "12/1"],
    ["вулиця 8 Березня, 22", "22"], ["Бандери 12-А", "12-А"],
  ])("parses %s without confusing street digits with the house", (query, house) => {
    expect(getAddressParts(query).houseNumber).toBe(house);
  });
});

const building = {
  type: "Feature", id: "address-13",
  properties: { name: "13", categories: "adr_address", street: "В'ячеслава Чорновола",
    street_type: "просп.", settlement_id: "STL1NT7FL", settlement: "Львів" },
  geo_centroid: { type: "Point", coordinates: [24.025258, 49.846888] },
};
const street = {
  ...building, id: "street-chornovola",
  properties: { ...building.properties, name: "В'ячеслава Чорновола", categories: "adr_street", type: "просп." },
};

function mockResponse(data: unknown, status = 200, geoapify: unknown = { results: [] }, geoapifyStatus = 200) {
  const fetchMock = vi.fn<typeof fetch>().mockImplementation(async (input) => {
    const isGeoapify = String(input).includes("geoapify");
    const code = isGeoapify ? geoapifyStatus : status;
    return { ok: code === 200, status: code, json: async () => isGeoapify ? geoapify : data } as Response;
  });
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("VITE_VISICOM_API_KEY", "test-key");
  vi.stubEnv("VITE_GEOAPIFY_API_KEY", "test-geoapify-key");
  return fetchMock;
}

describe("Visicom geocoding", () => {
  it("uses prefix search restricted to Lviv for Чорно", async () => {
    const fetchMock = mockResponse({ type: "FeatureCollection", features: [street] });
    expect(await searchAddresses("Чорно")).toEqual([expect.objectContaining({
      address: "просп. В'ячеслава Чорновола", isComplete: false, houseNumber: undefined,
    })]);
    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(url.pathname).toBe("/data-api/4.0/uk/search/adr_street.json");
    expect(url.searchParams.get("text")).toBe("чорно*");
    expect(url.searchParams.get("intersect")).toBe("STL1NT7FL");
  });
  it("accepts a single Feature response for Чорновола 13", async () => {
    mockResponse(building);
    expect(await searchAddresses("чорновола 13")).toEqual([expect.objectContaining({
      houseNumber: "13", isComplete: true, lat: 49.846888, lng: 24.025258,
    })]);
  });
  it("uses Visicom address-prefix search for number completions", async () => {
    const fetchMock = mockResponse(building);
    await searchAddresses("Чорновола 13");
    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(url.pathname).toBe("/data-api/4.0/uk/search/adr_address.json");
    expect(url.searchParams.get("text")).toBe("чорновола 13*");
  });
  it("accepts letter suffixes case-insensitively", async () => {
    mockResponse({ ...building, properties: { ...building.properties, street: "Залізнична", street_type: "вул.", name: "7П" } });
    expect(await searchAddresses("Залізнична 7п")).toEqual([expect.objectContaining({ houseNumber: "7П", isComplete: true })]);
  });
  it("rejects a street or venue fallback for Чорновола 1333", async () => {
    mockResponse({ type: "FeatureCollection", features: [street, {
      ...building, properties: { ...building.properties, name: "1333", categories: "poi_bank" },
    }] });
    expect(await searchAddresses("Чорновола 1333")).toEqual([]);
  });
  it("offers Вітряна 10 as an explicit completion for Вітряна 1", async () => {
    mockResponse({ ...building, properties: { ...building.properties, street: "Вітряна", name: "10" } });
    expect(await searchAddresses("Вітряна 1")).toEqual([expect.objectContaining({ houseNumber: "10", isComplete: true })]);
  });
  it("rejects another street with the same number", async () => {
    mockResponse({ ...building, properties: { ...building.properties, street: "Вітрякова", name: "1" } });
    expect(await searchAddresses("Вітряна 1")).toEqual([]);
  });
  it("rejects another settlement even inside the bounding area", async () => {
    mockResponse({ ...building, properties: { ...building.properties, settlement_id: "another-city" } });
    expect(await searchAddresses("Чорновола 13")).toEqual([]);
  });
  it("rejects coordinates outside Lviv", async () => {
    mockResponse({ ...building, geo_centroid: { type: "Point", coordinates: [30.5, 50.4] } });
    expect(await searchAddresses("Чорновола 13")).toEqual([]);
  });
  it("respects an explicit street type", async () => {
    mockResponse(street);
    expect(await searchAddresses("вул. Чорно")).toEqual([]);
  });
  it("deduplicates address records", async () => {
    mockResponse({ type: "FeatureCollection", features: [building, { ...building, id: "duplicate" }] });
    expect(await searchAddresses("Чорновола 13")).toHaveLength(1);
  });
  it.each([{}, { type: "FeatureCollection", features: [] }])("handles empty responses", async (data) => {
    mockResponse(data);
    expect(await searchAddresses("Чорновола 1333")).toEqual([]);
  });
  it.each([401, 429, 500])("reports HTTP %s instead of showing no matches", async (status) => {
    mockResponse({}, status);
    await expect(searchAddresses("Чорновола 13")).rejects.toThrow(`HTTP ${status}`);
  });
  it("does not request anything after cancellation", async () => {
    const fetchMock = mockResponse(building);
    const controller = new AbortController();
    controller.abort();
    await expect(searchAddresses("Чорновола 13", controller.signal)).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("requires the Visicom key for autocomplete", async () => {
    const fetchMock = mockResponse(building);
    vi.stubEnv("VITE_VISICOM_API_KEY", "");
    await expect(searchAddresses("Чорно")).rejects.toThrow("Visicom");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

function geoAddress(street = "Варшавська вулиця", housenumber = "13") {
  return { street, housenumber, city: "Львів", lat: 49.8562064, lon: 24.0139444,
    result_type: "building", rank: { confidence_street_level: 1, confidence_building_level: 1, match_type: "full_match" } };
}

describe("Visicom completion with Geoapify coordinates", () => {
  it("uses Geoapify for an address missing from Visicom, before prefix suggestions", async () => {
    mockResponse({ ...building, properties: { ...building.properties, street: "Варшавська", street_type: "вул.", name: "133" } },
      200, { results: [geoAddress()] });
    const results = await searchAddresses("Варшавська 13");
    expect(results.map((item) => item.houseNumber)).toEqual(["13", "133"]);
    expect(results[0]).toMatchObject({ needsGeocoding: false, lat: 49.8562064, lng: 24.0139444 });
    expect(results[1].needsGeocoding).toBe(true);
  });
  it("replaces Visicom coordinates with Geoapify for the same address", async () => {
    mockResponse(building, 200, { results: [geoAddress("проспект В'ячеслава Чорновола")] });
    const results = await searchAddresses("Чорновола 13");
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ needsGeocoding: false, lat: 49.8562064, lng: 24.0139444 });
  });
  it("does not call Geoapify without a house number", async () => {
    const fetchMock = mockResponse(street);
    await searchAddresses("Чорно");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("visicom.ua");
  });
  it("confirms a Visicom house completion through Geoapify before use", async () => {
    const fetchMock = mockResponse(building, 200, { results: [geoAddress("проспект В'ячеслава Чорновола")] });
    const result = await geocodeAddressSuggestion({
      id: "visicom", address: "просп. В'ячеслава Чорновола, 13", street: "просп. В'ячеслава Чорновола",
      houseNumber: "13", isComplete: true, needsGeocoding: true, lat: 0, lng: 0,
    });
    expect(result).toMatchObject({ lat: 49.8562064, lng: 24.0139444, needsGeocoding: false });
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("api.geoapify.com/v1/geocode/search");
  });
  it("accepts geocoder results without checking building confidence", async () => {
    mockResponse({}, 200, { results: [{ ...geoAddress("проспект В'ячеслава Чорновола", "1333"),
      rank: { confidence_street_level: 0.9, confidence_building_level: 0, match_type: "full_match" } }] });
    expect(await searchAddresses("Чорновола 1333")).toEqual([expect.objectContaining({ houseNumber: "1333", needsGeocoding: false })]);
  });
  it("accepts shortened street names without requiring confidence exactly 1", async () => {
    mockResponse({}, 200, { results: [{ ...geoAddress("проспект В'ячеслава Чорновола"),
      rank: { confidence_street_level: 0.9, confidence_building_level: 0.9, match_type: "full_match" } }] });
    expect(await searchAddresses("Чорновола 13")).toEqual([expect.objectContaining({ needsGeocoding: false })]);
  });
  it("rejects another Geoapify street and another house number", async () => {
    mockResponse({}, 200, { results: [geoAddress("Вітрякова вулиця", "1"), geoAddress("Вітряна вулиця", "10")] });
    expect(await searchAddresses("Вітряна 1")).toEqual([]);
  });
  it("rejects results outside the city", async () => {
    mockResponse({}, 200, { results: [{ ...geoAddress(), city: "Винники" }, { ...geoAddress(), lat: 50.4, lon: 30.5 }] });
    expect(await searchAddresses("Варшавська 13")).toEqual([]);
  });
  it("keeps autocomplete usable when Geoapify fails", async () => {
    mockResponse(building, 200, {}, 503);
    expect(await searchAddresses("Чорновола 13")).toEqual([expect.objectContaining({ needsGeocoding: true })]);
  });
  it("finds a full address even if Visicom fails", async () => {
    mockResponse({}, 503, { results: [geoAddress()] });
    expect(await searchAddresses("Варшавська 13")).toEqual([expect.objectContaining({ needsGeocoding: false })]);
  });
  it("reports a geocoding outage instead of an invalid-address result", async () => {
    mockResponse({}, 200, {}, 503);
    await expect(searchAddresses("Варшавська 13")).rejects.toThrow("Geoapify");
  });
  it("keeps a selected Visicom address when Geoapify has no result", async () => {
    mockResponse({}, 200, { results: [] });
    expect(await geocodeAddressSuggestion({ id: "test", address: "Варшавська, 13", street: "Варшавська",
      houseNumber: "13", isComplete: true, needsGeocoding: true, lat: 49.84, lng: 24.03 })).toMatchObject({ id: "test", houseNumber: "13" });
  });
  it("does not repeat geocoding for an already confirmed result", async () => {
    const fetchMock = mockResponse({});
    const item = { id: "geoapify:test", address: "Варшавська, 13", street: "Варшавська",
      houseNumber: "13", isComplete: true, needsGeocoding: false, lat: 49.84, lng: 24.03 };
    expect(await geocodeAddressSuggestion(item)).toBe(item);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("matches a letter suffix with or without a hyphen", async () => {
    mockResponse({}, 200, { results: [geoAddress("вулиця Оноре де Бальзака", "1-А")] });
    const result = await geocodeAddressSuggestion({ id: "visicom", address: "вул. Оноре де Бальзака, 1А",
      street: "вул. Оноре де Бальзака", houseNumber: "1А", isComplete: true,
      needsGeocoding: true, lat: 49.84, lng: 24.03 });
    expect(result).toMatchObject({ houseNumber: "1А", needsGeocoding: false });
  });
  it("discards confirmation if the input changed while geocoding was pending", async () => {
    const fetchMock = mockResponse({});
    let deliver!: (response: Response) => void;
    fetchMock.mockImplementationOnce(() => new Promise<Response>((resolve) => { deliver = resolve; }));
    const controller = new AbortController();
    const pending = geocodeAddressSuggestion({ id: "visicom", address: "Варшавська, 13", street: "Варшавська",
      houseNumber: "13", isComplete: true, needsGeocoding: true, lat: 49.84, lng: 24.03 }, controller.signal);
    controller.abort();
    deliver({ ok: true, json: async () => ({ results: [geoAddress()] }) } as Response);
    await expect(pending).rejects.toThrow();
  });

  it("accepts street-level geocoding without house-existence metadata", async () => {
    const result = geoAddress("вулиця Степана Бандери");
    mockResponse({}, 200, { results: [{ ...result, housenumber: undefined, rank: undefined, result_type: "street" }] });
    expect(await searchAddresses("вул. Степана Бандери, 13")).toEqual([
      expect.objectContaining({ houseNumber: "13", isComplete: true, needsGeocoding: false }),
    ]);
  });
  it("uses an identical geocoding query for full and short street labels", async () => {
    const fetchMock = mockResponse({}, 200, { results: [geoAddress("вулиця Степана Бандери")] });
    await searchAddresses("вул. Степана Бандери, 13");
    await searchAddresses("вулиця Степана Бандери 13");
    const texts = fetchMock.mock.calls.filter(([url]) => String(url).includes("geoapify"))
      .map(([url]) => new URL(String(url)).searchParams.get("text"));
    expect(texts).toEqual(["вулиця Степана Бандери, 13, Львів"]);
  });

});

describe("consistent address labels", () => {
  it.each([
    ["Валова вулиця", undefined, "вул. Валова"],
    ["вулиця Валова", undefined, "вул. Валова"],
    ["вул. Валова", undefined, "вул. Валова"],
    ["Валова", "вул.", "вул. Валова"],
    ["Валова вулиця", "вул.", "вул. Валова"],
    ["проспект В’ячеслава Чорновола", undefined, "просп. В’ячеслава Чорновола"],
    ["Ринок площа", undefined, "пл. Ринок"],
    ["Тараса Шевченка бульвар", undefined, "бульв. Тараса Шевченка"],
  ])("formats %s consistently", (name, type, expected) => {
    expect(formatStreetLabel(name, type)).toBe(expected);
  });
  it("uses the same label for Geoapify results and Visicom completions", async () => {
    mockResponse({ ...building, properties: { ...building.properties, street: "Валова", street_type: "вул.", name: "11" } },
      200, { results: [geoAddress("Валова вулиця", "1")] });
    const results = await searchAddresses("вул. Валова, 1");
    expect(results.map(item => item.address)).toEqual(["вул. Валова, 1", "вул. Валова, 11"]);
    expect(results.every(item => item.street === "вул. Валова")).toBe(true);
  });
});

describe("typing request scheduling", () => {
  it("shows Visicom suggestions before Geoapify and cancels the delayed request", async () => {
    const fetchMock = mockResponse(building);
    const controller = new AbortController();
    const onSuggestions = vi.fn();
    const pending = searchAddresses("Чорновола 13", controller.signal, onSuggestions);
    await vi.waitFor(() => expect(onSuggestions).toHaveBeenCalledWith([
      expect.objectContaining({ houseNumber: "13" }),
    ]));
    expect(fetchMock.mock.calls.every(([url]) => String(url).includes("visicom"))).toBe(true);
    controller.abort();
    await expect(pending).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("reuses completed autocomplete when returning to an earlier query", async () => {
    const fetchMock = mockResponse(street);
    await searchAddresses("Чорно");
    await searchAddresses("Чорнов");
    await searchAddresses("Чорно");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it("reuses geocoding for repeated selection of the same completion", async () => {
    const fetchMock = mockResponse({}, 200, { results: [geoAddress("проспект В'ячеслава Чорновола")] });
    const item = { id: "visicom", address: "просп. В'ячеслава Чорновола, 13",
      street: "просп. В'ячеслава Чорновола", houseNumber: "13", isComplete: true,
      needsGeocoding: true, lat: 49.84, lng: 24.03 };
    await geocodeAddressSuggestion(item);
    await geocodeAddressSuggestion(item);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("does not cache failed requests", async () => {
    const fetchMock = mockResponse({}, 503);
    await expect(searchAddresses("Чорно")).rejects.toThrow();
    await expect(searchAddresses("Чорно")).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("uppercase house suffixes", () => {
  it("normalizes both providers' suggestions to uppercase", async () => {
    mockResponse({ ...building, properties: { ...building.properties, name: "67ба" } },
      200, { results: [geoAddress("проспект В'ячеслава Чорновола", "67б")] });
    const results = await searchAddresses("Чорновола 67б");
    expect(results.map(item => item.houseNumber)).toEqual(["67Б", "67БА"]);
    expect(results[0].address).toBe("просп. В'ячеслава Чорновола, 67Б");
  });
  it("keeps the uppercase letter after geocoding a selected completion", async () => {
    mockResponse({}, 200, { results: [geoAddress("проспект В'ячеслава Чорновола", "67б")] });
    const selected = await geocodeAddressSuggestion({ id: "visicom", address: "просп. В'ячеслава Чорновола, 67Б",
      street: "просп. В'ячеслава Чорновола", houseNumber: "67Б", isComplete: true,
      needsGeocoding: true, lat: 49.84, lng: 24.03 });
    expect(selected?.houseNumber).toBe("67Б");
    expect(selected?.address).toBe("просп. В'ячеслава Чорновола, 67Б");
  });
});

describe("house-number punctuation", () => {
  it.each([
    ["67-Ж", "67Ж"], ["67-ж", "67Ж"], ["67 – ж", "67Ж"],
    ["12-14", "12-14"], ["12/1", "12/1"],
  ])("formats %s as %s", (value, expected) => {
    expect(formatHouseNumber(value)).toBe(expected);
  });
});

describe("Lviv Shevchenko streets", () => {
  const shevchenkoStreet = { ...street, id: "street-shevchenko", properties: {
    ...street.properties, name: "Шевченка", type: "вул.",
  } };
  const shevchenkoAvenue = { ...street, id: "avenue-shevchenko", properties: {
    ...street.properties, name: "Шевченка", type: "просп.",
  } };
  it("keeps the street and avenue as two separate suggestions", async () => {
    mockResponse({ type: "FeatureCollection", features: [shevchenkoStreet, shevchenkoAvenue] });
    const results = await searchAddresses("шевченка");
    expect(results.map(item => item.street)).toEqual(["вул. Тараса Шевченка", "просп. Тараса Шевченка"]);
  });
  it("finds abbreviated provider names when the user enters Тараса Шевченка", async () => {
    const fetchMock = mockResponse({ type: "FeatureCollection", features: [shevchenkoStreet, shevchenkoAvenue] });
    expect(await searchAddresses("Тараса Шевченка")).toHaveLength(2);
    expect(new URL(String(fetchMock.mock.calls[0]?.[0])).searchParams.get("text")).toBe("шевченка*");
  });
  it("respects an explicitly requested avenue", async () => {
    mockResponse({ type: "FeatureCollection", features: [shevchenkoStreet, shevchenkoAvenue] });
    expect(await searchAddresses("просп. Шевченка")).toEqual([
      expect.objectContaining({ street: "просп. Тараса Шевченка" }),
    ]);
  });
  it("merges Шевченка and Тараса Шевченка from the two providers for the same street", async () => {
    mockResponse({ ...building, properties: { ...building.properties, name: "344", street: "Шевченка", street_type: "вул." } },
      200, { results: [geoAddress("вулиця Тараса Шевченка", "344")] });
    const results = await searchAddresses("вул. Шевченка, 344");
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ address: "вул. Тараса Шевченка, 344", needsGeocoding: false });
  });
  it("does not merge the same house number on the street and avenue", async () => {
    mockResponse({ type: "FeatureCollection", features: [
      { ...building, properties: { ...building.properties, street: "Шевченка", street_type: "вул." } },
      { ...building, id: "avenue-13", properties: { ...building.properties, street: "Шевченка", street_type: "просп." } },
    ] });
    const results = await searchAddresses("Шевченка 13");
    expect(results.map(item => item.street)).toEqual(["вул. Тараса Шевченка", "просп. Тараса Шевченка"]);
  });
});

describe("street type in provider requests", () => {
  it("keeps avenue in both requests for просп. Тараса Шевченка, 1", async () => {
    const fetchMock = mockResponse({}, 200, { results: [geoAddress("проспект Тараса Шевченка", "1")] });
    const results = await searchAddresses("просп. Тараса Шевченка, 1");
    expect(results[0]).toMatchObject({ address: "просп. Тараса Шевченка, 1", needsGeocoding: false });
    const urls = fetchMock.mock.calls.map(([url]) => new URL(String(url)));
    expect(urls.find(url => url.hostname.includes("visicom"))?.searchParams.get("text")).toBe("проспект шевченка 1*");
    expect(urls.find(url => url.hostname.includes("geoapify"))?.searchParams.get("text")).toBe("проспект Тараса Шевченка, 1, Львів");
  });
  it("does not reuse the avenue query when searching the same street number", async () => {
    const fetchMock = mockResponse({});
    await searchAddresses("просп. Тараса Шевченка, 1");
    await searchAddresses("вул. Тараса Шевченка, 1");
    const texts = fetchMock.mock.calls.filter(([url]) => String(url).includes("geoapify"))
      .map(([url]) => new URL(String(url)).searchParams.get("text"));
    expect(texts).toEqual(["проспект Тараса Шевченка, 1, Львів", "вулиця Тараса Шевченка, 1, Львів"]);
  });
});
