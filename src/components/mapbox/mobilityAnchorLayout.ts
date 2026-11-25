import type { MobilityAnchor } from "../../lib/mobilityAnchors";

export type ProjectedAnchor = { anchor: MobilityAnchor; x: number; y: number };

// Group by screen distance so nearby buildings separate naturally as the map zooms in.
export function groupAnchorPositions(
  points: readonly ProjectedAnchor[],
  radius = 28,
): ProjectedAnchor[][] {
  const remaining = new Set(points);
  const groups: ProjectedAnchor[][] = [];
  while (remaining.size) {
    const seed = remaining.values().next().value!;
    remaining.delete(seed);
    const group = [seed];
    for (let i = 0; i < group.length; i++) {
      for (const point of remaining) {
        if (Math.hypot(point.x - group[i].x, point.y - group[i].y) < radius) {
          group.push(point);
          remaining.delete(point);
        }
      }
    }
    groups.push(group);
  }
  return groups;
}

export function anchorMarkerSize(zoom: number, count: number) {
  return count > 1 ? 22 : Math.min(18, Math.max(10, 10 + (zoom - 10) * 1.6));
}
