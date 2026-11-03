export const comfortPalette = [
  "#fba49e",
  "#ffc29c",
  "#ffe99d",
  "#cae7ad",
  "#a4dfbb",
] as const;

export function comfortColor(score: number): string {
  const position =
    Math.max(0, Math.min(100, Number.isFinite(score) ? score : 0)) / 25;
  const lower = Math.floor(position),
    upper = Math.min(4, lower + 1);
  const fraction = position - lower;
  const channels = [1, 3, 5].map((offset) => {
    const start = parseInt(comfortPalette[lower].slice(offset, offset + 2), 16);
    const end = parseInt(comfortPalette[upper].slice(offset, offset + 2), 16);
    return Math.round(start + (end - start) * fraction);
  });
  return `rgb(${channels.join(", ")})`;
}
