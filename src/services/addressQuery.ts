import { formatStreetLabel } from "./addressFormat";
import { getAddressParts, normalizeHouseNumber } from "./addressValidation";

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

// Normalize case, apostrophes, and punctuation for matching.
export function normalize(value: string): string {
  return value.toLocaleLowerCase("uk").normalize("NFKC")
    .replace(/[’ʼ`']/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

export const streetTypes: Record<string, string> = {
  вул: "вулиця", вулиця: "вулиця", просп: "проспект", пр: "проспект",
  проспект: "проспект", пл: "площа", площа: "площа", пров: "провулок",
  провулок: "провулок", бульв: "бульвар", бульвар: "бульвар", проїзд: "проїзд",
};

export function addressKey(item: Pick<AddressSuggestion, "street" | "houseNumber">): string {
  // Street and avenue with the same name are different places.
  const street = normalize(formatStreetLabel(item.street));
  return `${street}|${normalizeHouseNumber(item.houseNumber ?? "")}`;
}

export function parseAddressQuery(query: string) {
  const { street, houseNumber } = getAddressParts(query);
  const words = normalize(street).split(" ").filter(Boolean);
  const wantedType = words.map((word) => streetTypes[word]).find(Boolean);
  const terms = words.filter((word) => word !== "львів" && !streetTypes[word]);
  return { street, houseNumber, terms, wantedType };
}
