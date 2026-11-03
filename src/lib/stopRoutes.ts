export type RouteKind = "bus" | "marshrutka" | "trolley" | "tram" | "other";

export const routeKindLabel: Record<RouteKind, string> = {
  bus: "Автобус",
  marshrutka: "Маршрутка",
  trolley: "Тролейбус",
  tram: "Трамвай",
  other: "Маршрут",
};

const routeKindOrder: RouteKind[] = [
  "bus",
  "marshrutka",
  "trolley",
  "tram",
  "other",
];

// City buses are the АТП-1 routes in the Lviv GTFS. Private carriers on the
// same "А" prefix are marshrutkas. "А39" and "А39а" are different routes.
const cityBusNumbers = new Set([
  "А01", "А03", "А05", "А06", "А08а", "А09", "А10", "А16", "А18", "А19",
  "А20", "А29", "А32", "А37", "А39а", "А40", "А45", "А46", "А47", "А49",
  "А52", "А55", "А56", "А60", "А61", "А63", "А92", "А99",
]);

function catalogNumber(number: string): string {
  return number.replaceAll("A", "А").replaceAll("a", "а");
}

function routeKind(number: string): RouteKind {
  const prefix = number.replace(/\d.*$/, "");
  const key = prefix.toLocaleUpperCase("uk");
  if (key === "А" || key === "A") {
    return cityBusNumbers.has(catalogNumber(number)) ? "bus" : "marshrutka";
  }
  // "Тр" before "Т", otherwise a trolleybus collapses into the tram group.
  if (key === "ТР" || key === "TR") return "trolley";
  if (key === "Т" || key === "T") return "tram";
  return "other";
}

function routePlate(number: string): { kind: RouteKind; plate: string } {
  const prefix = number.replace(/\d.*$/, "");
  const rest = number.slice(prefix.length);
  // "А08а" and "Тр23" drop the mode letters; a letter after the digits stays.
  const body = rest || number;
  return {
    kind: routeKind(number),
    plate: body.replace(/^0+(?=\d)/, "") || body,
  };
}

export interface StopRouteGroup {
  kind: RouteKind;
  label: string;
  plates: string[];
}

export function groupStopRoutes(routes: { number: string }[]): StopRouteGroup[] {
  const seen = new Set<string>();
  const numbers = routes
    .map((route) => route.number)
    .filter((number) => {
      if (seen.has(number)) return false;
      seen.add(number);
      return true;
    })
    .sort((a, b) => a.localeCompare(b, "uk", { numeric: true }));

  const grouped = new Map<RouteKind, string[]>();
  for (const number of numbers) {
    const { kind, plate } = routePlate(number);
    const list = grouped.get(kind) ?? [];
    list.push(plate);
    grouped.set(kind, list);
  }

  return routeKindOrder.flatMap((kind) => {
    const plates = grouped.get(kind);
    if (!plates?.length) return [];
    return [{ kind, label: routeKindLabel[kind], plates }];
  });
}

export function routesCountLabel(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  const word =
    mod10 === 1 && mod100 !== 11
      ? "маршрут"
      : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
        ? "маршрути"
        : "маршрутів";
  return `${count} ${word}`;
}
