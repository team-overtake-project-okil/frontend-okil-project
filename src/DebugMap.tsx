import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { cellToBoundary, cellToLatLng } from "h3-js";
import cityBoundary from "./data/lviv-city.json";
import { coordsToH3 } from "./lib/h3";
import { comfortPalette } from "./lib/palette";
import { categoryMarker } from "./categoryMarker";

// Match the main map orientation using the northmost vertex of its central cell.
const reference = coordsToH3(49.8429, 24.0316);
const [lat, lng] = cellToLatLng(reference);
const [vertexLat, vertexLng] = cellToBoundary(reference).reduce(
  (north, vertex) => (vertex[0] > north[0] ? vertex : north),
);
const centerPoint = mapboxgl.MercatorCoordinate.fromLngLat([lng, lat]);
const vertexPoint = mapboxgl.MercatorCoordinate.fromLngLat([
  vertexLng,
  vertexLat,
]);
const GRID_BEARING =
  (Math.atan2(vertexPoint.x - centerPoint.x, centerPoint.y - vertexPoint.y) *
    180) /
  Math.PI;

const cityBounds = new mapboxgl.LngLatBounds();
for (const [lng, lat] of cityBoundary.coordinates[0])
  cityBounds.extend([lng, lat]);

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
      style: "mapbox://styles/mapbox/light-v11",
      center: valid ? [cam[0], cam[1]] : [24.0316, 49.8429],
      zoom: valid ? cam[2] : 13,
      projection: "mercator",
      minZoom: 7,
      maxPitch: 0,
      renderWorldCopies: false,
      bearing: GRID_BEARING,
      bearingSnap: 0,
      dragRotate: false,
      touchPitch: false,
    });
    map.touchZoomRotate.disableRotation();
    map.keyboard.disableRotation();
    instance.current = map;
    const limitOverview = () => {
      const camera = map.cameraForBounds(cityBounds, {
        padding: { top: 76, bottom: 44, left: 40, right: 40 },
        bearing: GRID_BEARING,
      });
      if (camera?.zoom !== undefined) map.setMinZoom(camera.zoom);
    };
    const observer = new ResizeObserver(() => {
      map.resize();
      limitOverview();
    });
    observer.observe(host.current);
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
      const baseLayers = map.getStyle().layers;
      const roadAnchor =
        baseLayers.find(
          (layer) =>
            layer.type === "line" && /road|bridge|tunnel/.test(layer.id),
        )?.id ?? baseLayers.find((layer) => layer.type === "symbol")?.id;
      for (const layer of baseLayers) {
        if (layer.type === "symbol" && /road|street/.test(layer.id)) {
          map.setPaintProperty(layer.id, "text-color", "#515b56");
          map.setPaintProperty(layer.id, "text-halo-color", "#ffffff");
          map.setPaintProperty(layer.id, "text-halo-width", 1.3);
        }
      }
      map.addLayer(
        {
          id: "cells",
          type: "fill",
          source: "cells",
          paint: {
            "fill-opacity": ["case", ["has", "score"], 0.48, 0.14],
            "fill-color": [
              "case",
              ["has", "score"],
              [
                "interpolate",
                ["linear"],
                ["get", "score"],
                0,
                comfortPalette[0],
                25,
                comfortPalette[1],
                50,
                comfortPalette[2],
                75,
                comfortPalette[3],
                100,
                comfortPalette[4],
              ],
              "#D1D1D6",
            ],
          },
        },
        roadAnchor,
      );
      map.addLayer({
        id: "edges",
        type: "line",
        source: "cells",
        paint: {
          "line-width": 0.6,
          "line-color": "#8e9690",
          "line-opacity": 0.35,
        },
      });
      map.moveLayer("edges", roadAnchor);
      map.addLayer({
        id: "selection-glow",
        type: "line",
        source: "cells",
        filter: ["==", ["get", "selected"], true],
        paint: {
          "line-color": "#405c4a",
          "line-width": 6,
          "line-blur": 1.5,
          "line-opacity": 0.28,
        },
      });
      map.addLayer({
        id: "selection",
        type: "line",
        source: "cells",
        filter: ["==", ["get", "selected"], true],
        paint: {
          "line-color": "#405c4a",
          "line-width": 2,
          "line-opacity": 0.85,
        },
      });
      map.on("mouseenter", "cells", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "cells", () => {
        map.getCanvas().style.cursor = "";
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
    limitOverview();
    map.on("error", (e) => setError(e.error.message));
    return () => {
      observer.disconnect();
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
        return {
          type: "Feature" as const,
          properties: {
            id: c.h3_id,
            ...(score === undefined ? {} : { score }),
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
    const narrow = instance.current.getContainer().clientWidth <= 760;
    instance.current.easeTo({
      center: [p.lon, p.lat],
      offset: narrow
        ? [0, -instance.current.getContainer().clientHeight * 0.22]
        : [-194, 0],
    });
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
    popup
      .getElement()
      ?.querySelector(".mapboxgl-popup-close-button")
      ?.setAttribute("aria-label", "Закрити POI");
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
    const map = instance.current;
    map.flyTo({
      center: [lng, lat],
      zoom: Math.max(map.getZoom(), 13.5),
      bearing: GRID_BEARING,
      offset: [0, 0],
      padding: { top: 0, bottom: 0, left: 0, right: 0 },
      retainPadding: false,
    });
  }, [props.selected, ready]);
  return (
    <div className="debug-map" ref={host}>
      {(!import.meta.env.VITE_MAPBOX_TOKEN || error) && (
        <p role="alert">{error || "Потрібен VITE_MAPBOX_TOKEN"}</p>
      )}
    </div>
  );
}
