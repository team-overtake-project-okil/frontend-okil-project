import { requestAddressJson } from "./addressRequests";
import { formatHouseNumber, formatStreetLabel } from "./addressFormat";
import { normalizeHouseNumber } from "./addressValidation";
import {
  addressKey,
  normalize,
  parseAddressQuery,
  streetTypes,
  type AddressSuggestion,
} from "./addressQuery";
import { isInLviv } from "./lvivBoundary";

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

export async function autocompleteVisicom(query: string, signal?: AbortSignal): Promise<AddressSuggestion[]> {
  const address = query.trim();
  if (address.length < 3) return [];
  signal?.throwIfAborted();
  const { houseNumber, terms, wantedType } = parseAddressQuery(address);
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
