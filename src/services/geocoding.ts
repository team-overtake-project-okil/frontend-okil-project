import cityBoundary from "../data/lviv-city.json";

export type AddressSuggestion = {
  id: string;
  address: string;
  lat: number;
  lng: number;
};

type GeocodingResult = {
  place_id?: string;
  street?: string;
  housenumber?: string;
  city?: string;
  lat?: number;
  lon?: number;
  result_type?: string;
};

type GeocodingResponse = { results?: GeocodingResult[] };

// Limit API requests to the Lviv bounding box.
const rings = cityBoundary.coordinates;
const points = rings.flat();
const bounds = [
  Math.min(...points.map(([lng]) => lng)),
  Math.min(...points.map(([, lat]) => lat)),
  Math.max(...points.map(([lng]) => lng)),
  Math.max(...points.map(([, lat]) => lat)),
].join(",");
let cityFilter: string | undefined;

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

const streetTypes: Record<string, string> = {
  вул: "вулиця", вулиця: "вулиця", просп: "проспект", пр: "проспект",
  проспект: "проспект", пл: "площа", площа: "площа", пров: "провулок",
  провулок: "провулок", бульв: "бульвар", бульвар: "бульвар", проїзд: "проїзд",
};

// Send a Geoapify request and handle HTTP errors.
async function request(
  endpoint: "autocomplete" | "search",
  parameters: Record<string, string>,
  signal?: AbortSignal,
): Promise<GeocodingResult[]> {
  const apiKey = import.meta.env.VITE_GEOAPIFY_API_KEY;
  if (!apiKey) throw new Error("Не налаштовано VITE_GEOAPIFY_API_KEY.");
  const params = new URLSearchParams({
    lang: "uk", format: "json", limit: "10", ...parameters, apiKey,
  });
  const response = await fetch(`https://api.geoapify.com/v1/geocode/${endpoint}?${params}`, { signal });
  if (!response.ok) throw new Error(`Не вдалося знайти адресу (HTTP ${response.status}).`);
  const data: GeocodingResponse = await response.json();
  return data.results ?? [];
}

// Fetch the city filter once and reuse it for later searches.
async function getCityFilter(signal?: AbortSignal): Promise<string> {
  if (cityFilter) return cityFilter;
  const cities = await request("search", {
    text: "Львів, Львівська область", type: "city", filter: "countrycode:ua",
  }, signal);
  const city = cities.find((item) =>
    ["львів", "lviv"].includes(normalize(item.city ?? "")) &&
    item.lon !== undefined && item.lat !== undefined && isInLviv(item.lon, item.lat));
  if (!city?.place_id) throw new Error("Не вдалося визначити межі Львова. Спробуйте ще раз.");
  cityFilter = `countrycode:ua|place:${city.place_id}|rect:${bounds}`;
  return cityFilter;
}

export async function searchAddresses(query: string, signal?: AbortSignal): Promise<AddressSuggestion[]> {
  const address = query.trim();
  if (address.length < 2) return [];
  signal?.throwIfAborted();

  // Separate the house number from the street name.
  const house = address.match(/(?:\s|,)\s*(\d+[\p{L}]?(?:[/-]\d+[\p{L}]?)?)\s*$/u);
  const streetQuery = house ? address.slice(0, house.index) : address;
  const words = normalize(streetQuery).split(" ").filter(Boolean);
  const wantedType = words.map((word) => streetTypes[word]).find(Boolean);
  const terms = words.filter((word) => word !== "львів" && !streetTypes[word]);
  if (!terms.length) return [];

  const parameters = {
    text: /львів/iu.test(address) ? address : `${address}, Львів`,
    filter: await getCityFilter(signal),
    bias: "proximity:24.0316,49.8429",
  };

  // Filter unrelated addresses and remove duplicates.
  const toSuggestions = (results: GeocodingResult[]): AddressSuggestion[] => {
    const unique = new Map<string, AddressSuggestion>();
    // Prefer addresses over venues at the same location.
    const ordered = [...results].sort((a, b) =>
      Number(a.result_type === "amenity") - Number(b.result_type === "amenity"));
    for (const result of ordered) {
      const { street, housenumber, lat, lon } = result;
      if (!street || lat === undefined || lon === undefined ||
        !Number.isFinite(lat) || !Number.isFinite(lon) || !isInLviv(lon, lat)) continue;
      const streetWords = normalize(street).split(" ");
      if (!terms.every((term) => streetWords.some((word) => word.startsWith(term)))) continue;
      if (wantedType && !streetWords.some((word) => streetTypes[word] === wantedType)) continue;
      if (house && normalize(housenumber ?? "") !== normalize(house[1])) continue;
      // Build a short label without city, postcode, or country.
      const label = [street, housenumber].filter(Boolean).join(", ").replace(/\s+/g, " ").trim();
      const key = normalize(label);
      if (!unique.has(key)) unique.set(key, {
        id: result.place_id ?? key, address: label, lat, lng: lon,
      });
    }
    return [...unique.values()].slice(0, 5);
  };

  // Try autocomplete first, then fall back to regular search.
  const suggestions = toSuggestions(await request("autocomplete", parameters, signal));
  if (suggestions.length) return suggestions;
  signal?.throwIfAborted();
  return toSuggestions(await request("search", parameters, signal));
}
