import { waitForGeocoding } from "./addressRequests";
import { getAddressParts, normalizeHouseNumber } from "./addressValidation";
import { addressKey, type AddressSuggestion } from "./addressQuery";
import { searchGeoapify } from "./geoapifySearch";
import { autocompleteVisicom } from "./visicomSearch";

export type { AddressSuggestion };

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
