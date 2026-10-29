const streetLabels: Record<string, string> = {
  вул: "вул.", вулиця: "вул.",
  пр: "просп.", просп: "просп.", проспект: "просп.",
  пл: "пл.", площа: "пл.",
  пров: "пров.", провулок: "пров.",
  бульв: "бульв.", бульвар: "бульв.",
  проїзд: "проїзд", узвіз: "узвіз", набережна: "наб.", наб: "наб.",
};

function labelFor(value: string): string | undefined {
  return streetLabels[value.toLocaleLowerCase("uk").replace(/\.$/u, "")];
}

// Providers put the street type in a separate field, before, or after the name.
export function formatStreetLabel(name: string, type?: string): string {
  const words = name.trim().replace(/\s+/g, " ").split(" ");
  const prefix = words.length > 1 ? labelFor(words[0]) : undefined;
  if (prefix) words.shift();
  const suffix = words.length > 1 ? labelFor(words[words.length - 1]) : undefined;
  if (suffix) words.pop();
  const label = (type ? labelFor(type.trim()) : undefined) ?? prefix ?? suffix;
  let streetName = words.join(" ");
  // Lviv providers abbreviate these two distinct streets to just «Шевченка».
  if (["вул.", "просп."].includes(label ?? "") &&
    /^(?:(?:т\.?|тараса)\s+)?шевченка$/iu.test(streetName)) {
    streetName = "Тараса Шевченка";
  }
  return [label, streetName].filter(Boolean).join(" ");
}

export function formatHouseNumber(value: string): string {
  return value.trim().toLocaleUpperCase("uk").replace(/\s*[-–—]\s*(?=\p{L})/gu, "");
}
