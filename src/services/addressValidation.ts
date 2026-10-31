// A number in a street name (for example, «8 Березня») is not a house number.
export function getAddressParts(query: string) {
  const address = query.trim();
  const match = address.match(/(?:\s|,)\s*(\d+\s*(?:-?\s*\p{L})?(?:[/-]\d+\s*(?:-?\s*\p{L})?)?)\s*$/u);
  const street = match ? address.slice(0, match.index).trim() : address;
  const hasStreet = /\p{L}/u.test(street.replace(/(?:^|\s)(?:вул\.?|вулиця|просп\.?|проспект|пл\.?|площа|пров\.?|провулок|бульвар|проїзд)(?=\s|$)/giu, ""));
  return { street, houseNumber: match && hasStreet ? match[1].replace(/\s+/g, "") : undefined };
}

export function normalizeHouseNumber(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase("uk").replace(/\s+/g, "").replace(/-(?=\p{L})/gu, "");
}
