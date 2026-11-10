import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { cellToBoundary, cellToLatLng } from "h3-js";
import { categoryMarker } from "./categoryMarker";

export type Cell = {
  h3_id: string;
  overall_rating: number;
  category_scores?: Record<string, number>;
};
export type Dot = {
  lat: number;
  lon: number;
  kind: string;
  id: number;
  inside: boolean;
  name: string | null;
  categoryLabel?: string;
  category?: string;
  influence?: string;
};
export type Camera = [number, number, number];
type Props = {
  cells: Cell[];
  scores: Record<string, number>;
  difference: boolean;
  selected: string;
  dots: Dot[];
  focus: Dot | null;
  onSelect: (id: string) => void;
  onPointSelect: (point: Dot) => void;
  onView: (ids: string[], camera: Camera) => void;
};

export default function DebugMap(props: Props) {
  const host = useRef<HTMLDivElement>(null),
    instance = useRef<mapboxgl.Map | null>(null);
  const latest = useRef(props);
  useEffect(() => {
    latest.current = props;
  }, [props]);
  const [ready, setReady] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    if (!host.current || !import.meta.env.VITE_MAPBOX_TOKEN) return;
    const params = new URLSearchParams(location.search);
    const cam = params.get("view")?.split(",").map(Number);
    const valid = cam?.length === 3 && cam.every(Number.isFinite);
    const map = new mapboxgl.Map({
      container: host.current,
      accessToken: import.meta.env.VITE_MAPBOX_TOKEN,
      style: "mapbox://styles/mapbox/streets-v12",
      center: valid ? [cam[0], cam[1]] : [24.0316, 49.8429],
      zoom: valid ? cam[2] : 13,
    });
    instance.current = map;
    const view = () => {
      const center = map.getCenter(),
        bounds = map.getBounds();
      if (bounds)
        latest.current.onView(
          latest.current.cells
            .filter((c) => {
              const [lat, lng] = cellToLatLng(c.h3_id);
              const box = cellToBoundary(c.h3_id);
              return (
                bounds.contains([lng, lat]) ||
                box.some(([y, x]) => bounds.contains([x, y])) ||
                (Math.min(...box.map((v) => v[0])) <= bounds.getNorth() &&
                  Math.max(...box.map((v) => v[0])) >= bounds.getSouth() &&
                  Math.min(...box.map((v) => v[1])) <= bounds.getEast() &&
                  Math.max(...box.map((v) => v[1])) >= bounds.getWest())
              );
            })
            .map((c) => c.h3_id),
          [center.lng, center.lat, map.getZoom()],
        );
    };
    map.on("load", () => {
      map.addSource("cells", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "cells",
        type: "fill",
        source: "cells",
        paint: { "fill-opacity": 0.25, "fill-color": ["get", "color"] },
      });
      map.addLayer({
        id: "edges",
        type: "line",
        source: "cells",
        paint: {
          "line-width": ["case", ["get", "selected"], 3, 0.6],
          "line-color": "#253431",
        },
      });
      map.on("click", "cells", (e) => {
        const id = (
          e.features?.[0] as { properties?: { id?: string } } | undefined
        )?.properties?.id;
        if (id) latest.current.onSelect(id);
      });
      setReady(true);
      view();
    });
    map.on("moveend", view);
    map.on("error", (e) => setError(e.error.message));
    return () => {
      instance.current = null;
      map.remove();
    };
  }, []);
  useEffect(() => {
    if (ready) instance.current?.fire("moveend");
  }, [ready, props.cells]);
  useEffect(() => {
    const map = instance.current;
    if (!ready || !map) return;
    const data = {
      type: "FeatureCollection" as const,
      features: props.cells.map((c) => {
        const score = props.scores[c.h3_id];
        const color =
          score === undefined
            ? "#acadaf"
            : props.difference
              ? score > 0
                ? "#167955"
                : score < 0
                  ? "#bc503d"
                  : "#d8d8ce"
              : `hsl(${Math.round(score * 1.2)},64%,48%)`;
        return {
          type: "Feature" as const,
          properties: {
            id: c.h3_id,
            color,
            selected: c.h3_id === props.selected,
          },
          geometry: {
            type: "Polygon" as const,
            coordinates: [cellToBoundary(c.h3_id, true)],
          },
        };
      }),
    };
    (map.getSource("cells") as mapboxgl.GeoJSONSource)?.setData(data);
  }, [ready, props.cells, props.scores, props.selected, props.difference]);
  useEffect(() => {
    if (!ready || !instance.current) return;
    const markers = props.dots.map((p) => {
      const marker = new mapboxgl.Marker({
        element: categoryMarker(p.category),
      })
        .setLngLat([p.lon, p.lat])
        .addTo(instance.current!);
      const element = marker.getElement();
      element.tabIndex = 0;
      element.setAttribute("role", "button");
      element.setAttribute("aria-label", p.name || "Точка на мапі");
      element.style.cursor = "pointer";
      element.addEventListener("click", (event) => {
        event.stopPropagation();
        latest.current.onPointSelect({ ...p });
      });
      element.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          event.stopPropagation();
          latest.current.onPointSelect({ ...p });
        }
      });
      return marker;
    });
    return () => markers.forEach((m) => m.remove());
  }, [ready, props.dots]);
  useEffect(() => {
    if (!instance.current || !props.focus) return;
    const p = props.focus;
    instance.current.easeTo({ center: [p.lon, p.lat] });
    const content = document.createElement("div");
    content.className = "debug-point-popup";
    const title = document.createElement("strong");
    title.textContent = p.name || "Точка без назви";
    const category = document.createElement("p");
    category.textContent = p.categoryLabel || "Категорія невідома";
    const influence = document.createElement("p");
    influence.className = "debug-point-influence";
    influence.textContent = p.influence || "Завантаження впливу…";
    content.append(title, category, influence);
    const popup = new mapboxgl.Popup({
      offset: 22,
      maxWidth: "300px",
      className: "debug-popup",
    })
      .setLngLat([p.lon, p.lat])
      .setDOMContent(content)
      .addTo(instance.current);
    const marker = new mapboxgl.Marker({
      element: categoryMarker(p.category, true),
    })
      .setLngLat([p.lon, p.lat])
      .addTo(instance.current);
    marker.getElement().style.pointerEvents = "none";
    return () => {
      marker.remove();
      popup.remove();
    };
  }, [props.focus, ready]);
  useEffect(() => {
    if (!props.selected || !instance.current) return;
    const [lat, lng] = cellToLatLng(props.selected);
    if (!instance.current.getBounds()?.contains([lng, lat]))
      instance.current.flyTo({ center: [lng, lat], zoom: 14 });
  }, [props.selected, ready]);
  return (
    <div className="debug-map" ref={host}>
      {(!import.meta.env.VITE_MAPBOX_TOKEN || error) && (
        <p role="alert">{error || "Потрібен VITE_MAPBOX_TOKEN"}</p>
      )}
    </div>
  );
}
