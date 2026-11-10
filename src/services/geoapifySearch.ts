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
import { isInLviv, lvivBbox } from "./lvivBoundary";

type GeoapifyResult = {
  place_id?: string;
  street?: string;
  housenumber?: string;
  city?: string;
  lat?: number;
  lon?: number;
  result_type?: string;
};

export async function searchGeoapify(query: string, signal?: AbortSignal): Promise<AddressSuggestion[]> {
  signal?.throwIfAborted();
  const { street, houseNumber, terms, wantedType } = parseAddressQuery(query);
  if (!houseNumber) return [];
  const key = import.meta.env.VITE_GEOAPIFY_API_KEY;
  if (!key) throw new Error("Не налаштовано ключ пошуку адрес Geoapify.");
  if (!terms.length) return [];
  // Normalize abbreviations but preserve the requested type: a street and an
  // avenue with the same name must not produce the same provider query.
  const streetText = street.replace(/(?:^|\s)(?:вул\.?|вулиця|просп\.?|проспект|пр\.?|пл\.?|площа|пров\.?|провулок|бульв\.?|бульвар)(?=\s|$)/giu, " ")
    .replace(/[,]+$/u, "").replace(/\s+/g, " ").trim();
  const qualifiedStreet = [wantedType, streetText].filter(Boolean).join(" ");
  const text = `${qualifiedStreet}, ${houseNumber}${/львів/iu.test(streetText) ? "" : ", Львів"}`;
  const params = new URLSearchParams({
    text,
    lang: "uk", format: "json", limit: "10", apiKey: key,
    filter: `countrycode:ua|rect:${lvivBbox()}`, bias: "proximity:24.0316,49.8429",
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
