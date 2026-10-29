import { polygonToCells, cellToBoundary } from "h3-js";
import boundary from "../data/lviv-city.json";
// Actual Lviv administrative geometry; the highlighted cells illustrate interaction, not scores.
const cells = polygonToCells(boundary.coordinates, 7, true);
const ring = boundary.coordinates[0];
const minX = Math.min(...ring.map((p) => p[0])),
  maxX = Math.max(...ring.map((p) => p[0]));
const minY = Math.min(...ring.map((p) => p[1])),
  maxY = Math.max(...ring.map((p) => p[1]));
const project = (lng: number, lat: number) =>
  `${40 + ((lng - minX) / (maxX - minX)) * 440},${450 - ((lat - minY) / (maxY - minY)) * 390}`;
export function CityIllustration() {
  return (
    <figure className="city-illustration">
      <div className="illustration-top">
        <span>ЛЬВІВ</span>
        <span>49.84° N · 24.03° E</span>
      </div>
      <svg
        viewBox="0 0 520 500"
        role="img"
        aria-label="Контур Львова з гексагональною сіткою. Демонстрація взаємодії."
      >
        <path
          d={
            ring
              .map(([lng, lat], i) => (i ? "L" : "M") + project(lng, lat))
              .join(" ") + "Z"
          }
          fill="#e8eeeb"
          stroke="#c8d7d2"
        />
        {cells.map((id, i) => (
          <polygon
            key={id}
            className={i % 13 === 0 ? "demo-cell active-cell" : "demo-cell"}
            style={{ animationDelay: `${i % 5}s` }}
            points={cellToBoundary(id)
              .map(([lat, lng]) => project(lng, lat))
              .join(" ")}
          />
        ))}
        <text x="268" y="245" className="city-label">
          Львів
        </text>
      </svg>
      <figcaption>
        <span className="demo-dot" /> Місто ближче, ніж здається{" "}
        <small>Ілюстрація · не реальні оцінки</small>
      </figcaption>
    </figure>
  );
}
