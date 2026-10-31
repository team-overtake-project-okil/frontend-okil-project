import { requestAddressJson, waitForGeocoding } from "./addressRequests";
import { formatStreetLabel, formatHouseNumber } from "./addressFormat";
import { getAddressParts, normalizeHouseNumber } from "./addressValidation";
import cityBoundary from "../data/lviv-city.json";

export type AddressSuggestion = {
  id: string;
  address: string;
  street: string;
  houseNumber?: string;
  isComplete: boolean;
  needsGeocoding?: boolean;
  lat: number;
  lng: number;
};

const rings = cityBoundary.coordinates;

// Check whether a point is inside a polygon ring.
function isInRing(lng: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const cross = (lng - xi) * (yj - yi) - (lat - yi) * (xj - xi);
    if ((xi !== xj || yi !== yj) && Math.abs(cross) < 1e-12 &&
      lng >= Math.min(xi, xj) && lng <= Math.max(xi, xj) &&
      lat >= Math.min(yi, yj) && lat <= Math.max(yi, yj)) return true;
    if ((yi > lat) !== (yj > lat) &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// Check the city boundary, excluding polygon holes.
function isInLviv(lng: number, lat: number): boolean {
  return isInRing(lng, lat, rings[0]) &&
    !rings.slice(1).some((ring) => isInRing(lng, lat, ring));
}

// Normalize case, apostrophes, and punctuation for matching.
function normalize(value: string): string {
  return value.toLocaleLowerCase("uk").normalize("NFKC")
    .replace(/[’ʼ`']/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

type VisicomFeature = {
  type: "Feature";
  id?: string;
  properties?: {
    name?: string;
    categories?: string;
    type?: string;
    street?: string;
    street_type?: string;
    settlement_id?: string;
    settlement?: string;
  };
  geo_centroid?: { type?: string; coordinates?: number[] };
};

type VisicomResponse = VisicomFeature | {
  type?: "FeatureCollection";
  features?: VisicomFeature[];
  status?: string;
};

// Visicom's stable settlement ID scopes both endpoints to Lviv.
const LVIV_ID = "STL1NT7FL";
const streetTypes: Record<string, string> = {
  вул: "вулиця", вулиця: "вулиця", просп: "проспект", пр: "проспект",
  проспект: "проспект", пл: "площа", площа: "площа", пров: "провулок",
  провулок: "провулок", бульв: "бульвар", бульвар: "бульвар", проїзд: "проїзд",
};

async function request(
  endpoint: "search/adr_street" | "search/adr_address",
  text: string,
  signal?: AbortSignal,
): Promise<VisicomFeature[]> {
  const key = import.meta.env.VITE_VISICOM_API_KEY;
  if (!key) throw new Error("Не налаштовано ключ пошуку адрес Visicom.");
  const params = new URLSearchParams({ text, intersect: LVIV_ID, limit: "20", key });
  const data = await requestAddressJson<VisicomResponse>(
    `https://api.visicom.ua/data-api/4.0/uk/${endpoint}.json?${params}`, "Visicom", signal,
  );
  signal?.throwIfAborted();
  if (data.type === "Feature") return [data];
  if (data.status) throw new Error("Сервіс пошуку адрес тимчасово недоступний.");
  return data.features ?? [];
}

async function autocompleteVisicom(query: string, signal?: AbortSignal): Promise<AddressSuggestion[]> {
  const address = query.trim();
  if (address.length < 3) return [];
  signal?.throwIfAborted();
  const { street: streetQuery, houseNumber } = getAddressParts(address);
  const words = normalize(streetQuery).split(" ").filter(Boolean);
  const wantedType = words.map((word) => streetTypes[word]).find(Boolean);
  const terms = words.filter((word) => word !== "львів" && !streetTypes[word]);
  if (!terms.length) return [];

  // Both street names and house numbers can be unfinished while typing.
  // A full suggestion is confirmed only by an explicit selection in the UI.
  const searchTerms = terms.filter((term) => !(term === "тараса" &&
    terms.some((word) => "шевченка".startsWith(word))));
  const searchStreet = [wantedType, searchTerms.join(" ")].filter(Boolean).join(" ");
  const results = houseNumber
    ? await request("search/adr_address", `${searchStreet} ${houseNumber}*`, signal)
    : await request("search/adr_street", `${searchStreet}*`, signal);
  const unique = new Map<string, AddressSuggestion>();
  const matchesStreet = (street: string) => {
    const streetWords = normalize(street).split(" ");
    return terms.every((term) => streetWords.some((word) => word.startsWith(term)));
  };
  const matchesHouse = (house: string) => Boolean(houseNumber &&
    normalizeHouseNumber(house).startsWith(normalizeHouseNumber(houseNumber)));

  for (const result of results) {
    const props = result.properties;
    if (!props || props.settlement_id !== LVIV_ID) continue;
    const category = houseNumber ? "adr_address" : "adr_street";
    if (!props.categories?.split(",").includes(category)) continue;
    const streetName = houseNumber ? props.street : props.name;
    const streetType = houseNumber ? props.street_type : props.type;
    if (!streetName) continue;
    const street = formatStreetLabel(streetName, streetType);
    if (!matchesStreet(street)) continue;
    if (wantedType && streetTypes[normalize(streetType ?? "")] !== wantedType) continue;
    if (houseNumber && !matchesHouse(props.name ?? "")) continue;
    const coordinates = result.geo_centroid?.coordinates;
    if (result.geo_centroid?.type !== "Point" || !coordinates || coordinates.length !== 2) continue;
    const [lng, lat] = coordinates;
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !isInLviv(lng, lat)) continue;
    const displayHouse = houseNumber ? formatHouseNumber(props.name ?? houseNumber) : undefined;
    const label = displayHouse ? `${street}, ${displayHouse}` : street;
    const key = addressKey({ street, houseNumber: displayHouse });
    if (!unique.has(key)) unique.set(key, {
      id: result.id ?? key, address: label, street,
      houseNumber: displayHouse,
      isComplete: Boolean(houseNumber), needsGeocoding: Boolean(houseNumber), lat, lng,
    });
  }
  return [...unique.values()];
}

type GeoapifyResult = {
  place_id?: string;
  street?: string;
  housenumber?: string;
  city?: string;
  lat?: number;
  lon?: number;
  result_type?: string;
};

function addressKey(item: Pick<AddressSuggestion, "street" | "houseNumber">): string {
  // Street and avenue with the same name are different places.
  const street = normalize(formatStreetLabel(item.street));
  return `${street}|${normalizeHouseNumber(item.houseNumber ?? "")}`;
}

async function searchGeoapify(query: string, signal?: AbortSignal): Promise<AddressSuggestion[]> {
  signal?.throwIfAborted();
  const { street, houseNumber } = getAddressParts(query);
  if (!houseNumber) return [];
  const key = import.meta.env.VITE_GEOAPIFY_API_KEY;
  if (!key) throw new Error("Не налаштовано ключ пошуку адрес Geoapify.");
  const words = normalize(street).split(" ").filter(Boolean);
  const terms = words.filter((word) => word !== "львів" && !streetTypes[word]);
  const wantedType = words.map((word) => streetTypes[word]).find(Boolean);
  if (!terms.length) return [];
  const points = rings.flat();
  const bbox = [
    Math.min(...points.map(([lng]) => lng)), Math.min(...points.map(([, lat]) => lat)),
    Math.max(...points.map(([lng]) => lng)), Math.max(...points.map(([, lat]) => lat)),
  ].join(",");
  // Normalize abbreviations but preserve the requested type: a street and an
  // avenue with the same name must not produce the same provider query.
  const streetText = street.replace(/(?:^|\s)(?:вул\.?|вулиця|просп\.?|проспект|пр\.?|пл\.?|площа|пров\.?|провулок|бульв\.?|бульвар)(?=\s|$)/giu, " ")
    .replace(/[,]+$/u, "").replace(/\s+/g, " ").trim();
  const qualifiedStreet = [wantedType, streetText].filter(Boolean).join(" ");
  const text = `${qualifiedStreet}, ${houseNumber}${/львів/iu.test(streetText) ? "" : ", Львів"}`;
  const params = new URLSearchParams({
    text,
    lang: "uk", format: "json", limit: "10", apiKey: key,
    filter: `countrycode:ua|rect:${bbox}`, bias: "proximity:24.0316,49.8429",
  });
  const data = await requestAddressJson<{ results?: GeoapifyResult[] }>(
    `https://api.geoapify.com/v1/geocode/search?${params}`, "Geoapify", signal,
  );
  signal?.throwIfAborted();
  const unique = new Map<string, AddressSuggestion>();
  const ordered = [...(data.results ?? [])].sort((a, b) =>
    Number(a.result_type === "amenity") - Number(b.result_type === "amenity"));
  for (const result of ordered) {
    const { street: foundStreet, housenumber, lat, lon } = result;
    if (!foundStreet) continue;
    // Keep unrelated house numbers out of the suggestions, but accept street-level
    // coordinates when the geocoder has no house-number metadata.
    if (housenumber && normalizeHouseNumber(housenumber) !== normalizeHouseNumber(houseNumber)) continue;
    const displayHouse = formatHouseNumber(housenumber || houseNumber);
    const streetWords = normalize(foundStreet).split(" ");
    if (!terms.every((term) => streetWords.some((word) => word.startsWith(term)))) continue;
    if (wantedType && !streetWords.some((word) => streetTypes[word] === wantedType)) continue;
    if (!["львів", "lviv"].includes(normalize(result.city ?? ""))) continue;
    if (lat === undefined || lon === undefined || !Number.isFinite(lat) || !Number.isFinite(lon) || !isInLviv(lon, lat)) continue;
    const displayStreet = formatStreetLabel(foundStreet);
    const item: AddressSuggestion = {
      id: `geoapify:${result.place_id ?? `${foundStreet}:${displayHouse}`}`,
      address: `${displayStreet}, ${displayHouse}`, street: displayStreet, houseNumber: displayHouse,
      isComplete: true, needsGeocoding: false, lat, lng: lon,
    };
    const identity = addressKey(item);
    if (!unique.has(identity)) unique.set(identity, item);
  }
  return [...unique.values()];
}

// Visicom supplies completions; Geoapify supplies coordinates without checking house existence.
export async function searchAddresses(
  query: string,
  signal?: AbortSignal,
  onSuggestions?: (items: AddressSuggestion[]) => void,
): Promise<AddressSuggestion[]> {
  const address = query.trim();
  if (address.length < 3) return [];
  signal?.throwIfAborted();
  const { houseNumber } = getAddressParts(address);
  if (!houseNumber) return (await autocompleteVisicom(address, signal)).slice(0, 5);
  const completionPromise = autocompleteVisicom(address, signal).then((items) => {
    signal?.throwIfAborted();
    if (items.length) onSuggestions?.(items.slice(0, 5));
    return items;
  });
  const geocodingPromise = (async () => {
    // The UI already waits 700 ms. Geocode after 1300 ms of idle typing,
    // while immediate autocomplete remains available independently.
    if (onSuggestions) await waitForGeocoding(signal);
    return searchGeoapify(address, signal);
  })();
  const [completion, geocoding] = await Promise.allSettled([completionPromise, geocodingPromise]);
  signal?.throwIfAborted();
  const unique = new Map<string, AddressSuggestion>();
  if (completion.status === "fulfilled") {
    for (const item of completion.value) unique.set(addressKey(item), item);
  }
  if (geocoding.status === "fulfilled") {
    // Geocoded coordinates replace a completion for the same address.
    for (const item of geocoding.value) unique.set(addressKey(item), item);
  }
  if (!unique.size) {
    if (geocoding.status === "rejected") throw geocoding.reason;
    if (completion.status === "rejected") throw completion.reason;
  }
  return [...unique.values()].sort((a, b) => {
    const exactA = normalizeHouseNumber(a.houseNumber ?? "") === normalizeHouseNumber(houseNumber);
    const exactB = normalizeHouseNumber(b.houseNumber ?? "") === normalizeHouseNumber(houseNumber);
    return Number(exactB) - Number(exactA) ||
      Number(Boolean(a.needsGeocoding)) - Number(Boolean(b.needsGeocoding)) ||
      (a.houseNumber ?? "").localeCompare(b.houseNumber ?? "", "uk", { numeric: true });
  }).slice(0, 5);
}

export async function geocodeAddressSuggestion(item: AddressSuggestion, signal?: AbortSignal): Promise<AddressSuggestion | null> {
  signal?.throwIfAborted();
  if (!item.isComplete || !item.houseNumber) return null;
  if (!item.needsGeocoding) return item;
  return (await searchGeoapify(item.address, signal))[0] ?? item;
}
