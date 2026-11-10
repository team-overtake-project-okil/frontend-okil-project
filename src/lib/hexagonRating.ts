// Ціла оцінка гексагона, яку карта показує і передає в Mapbox
declare const intBrand: unique symbol;

export type int = number & { readonly [intBrand]: true };

function asInt(value: number): int {
  return Math.trunc(value) as int;
}

export type Hexagon = {
  h3_id: string;
  overall_rating: int;
};

export function withIntegerRating<T extends { overall_rating: number }>(
  item: T,
): Omit<T, "overall_rating"> & { overall_rating: int } {
  return { ...item, overall_rating: asInt(item.overall_rating) };
}
