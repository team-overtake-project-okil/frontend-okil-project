import type { Map } from "mapbox-gl";
import { cellToLatLng } from "h3-js";
import type { HexagonRoutes } from "../../lib/hexagonAssessment";

type Coordinate = [number, number];

export function clipRoutesAroundOrigin(
  map: Pick<Map, "project" | "unproject">,
  routes: HexagonRoutes,
  originId: string,
  radius: number,
): HexagonRoutes {
  const [lat, lng] = cellToLatLng(originId);
  const center = map.project([lng, lat]);

  const features = routes.features.flatMap((feature) => {
    const coordinates = feature.geometry.coordinates;
    const points = coordinates.map((coordinate) => map.project(coordinate));
    const sections: Coordinate[][] = [];
    let section: Coordinate[] = [];

    for (let index = 1; index < points.length; index += 1) {
      const start = points[index - 1];
      const end = points[index];
      const delta = end.sub(start);
      const relative = start.sub(center);
      const a = delta.x ** 2 + delta.y ** 2;
      if (!a) continue;

      const b = relative.x * delta.x + relative.y * delta.y;
      const c = relative.x ** 2 + relative.y ** 2 - radius ** 2;
      const discriminant = b ** 2 - a * c;
      const root = Math.sqrt(Math.max(0, discriminant));
      const entry = (-b - root) / a;
      const exit = (-b + root) / a;

      if (discriminant <= 0 || exit <= 0 || entry >= 1) {
        if (!section.length) section.push(coordinates[index - 1]);
        section.push(coordinates[index]);
        continue;
      }

      if (entry > 0) {
        if (!section.length) section.push(coordinates[index - 1]);
        section.push(map.unproject(start.add(delta.mult(entry))).toArray());
      }
      if (section.length > 1) sections.push(section);
      section = exit < 1
        ? [map.unproject(start.add(delta.mult(exit))).toArray(), coordinates[index]]
        : [];
    }

    if (section.length > 1) sections.push(section);
    return sections.map((coordinates) => ({
      ...feature,
      geometry: { ...feature.geometry, coordinates },
    }));
  });
  return { ...routes, features };
}
