// Шари карти: оцінки, вибрана ділянка, маршрути, порівняння і зупинки
import type { RefObject } from "react";
import mapboxgl from "mapbox-gl";
import { comfortPalette } from "../../lib/palette";
import {
  emptyStopsGeoJSON,
  type HexStopProperties,
} from "../../lib/useStopsByHex";
import { cityBounds, GRID_BEARING, hexScoreIndex, lvivHexes } from "./lvivGrid";
import {
  pointCoordinates,
  stopNameTagNode,
  stopPinImage,
  type StopHit,
} from "./stopPopup";

interface CityLayersOptions {
  padding: { top: number; bottom: number; left: number; right: number };
  limitOverview: () => void;
  hexScoresRef: RefObject<Map<string, number | undefined>>;
  stopsByIdRef: RefObject<Map<number, HexStopProperties>>;
  stopPopupRef: RefObject<mapboxgl.Popup | null>;
  stopNameTagRef: RefObject<mapboxgl.Popup | null>;
  canvas: HTMLCanvasElement;
}

export function installCityLayers(
  map: mapboxgl.Map,
  options: CityLayersOptions,
) {
  const {
    padding,
    limitOverview,
    hexScoresRef,
    stopsByIdRef,
    stopPopupRef,
    stopNameTagRef,
    canvas,
  } = options;
  const hexes = lvivHexes([]);
  hexScoresRef.current = hexScoreIndex(hexes);

  map.addSource("h3-hexes", {
    type: "geojson",
    data: hexes,
  });

  map.fitBounds(cityBounds, {
    padding,
    duration: 0,
    retainPadding: false,
    bearing: GRID_BEARING,
  });

  limitOverview();
  // Keep roads and labels above the assessment overlay, so the pastel
  // cells never wash out street names or the road network.
  const baseLayers = map.getStyle().layers;
  const roadAnchor =
    baseLayers.find(
      (layer) => layer.type === "line" && /road|bridge|tunnel/.test(layer.id),
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
      id: "h3-hexes-fill",
      type: "fill",
      source: "h3-hexes",
      paint: {
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
        //є score - опасіті 0.5, немає - 0.28
        "fill-opacity": ["case", ["has", "score"], 0.48, 0.14],
      },
    },
    roadAnchor,
  );

  map.addLayer(
    {
      id: "h3-hexes-line",
      type: "line",
      source: "h3-hexes",
      paint: {
        "line-color": "#8e9690",
        "line-width": 0.6,
        "line-opacity": 0.35,
      },
    },
    roadAnchor,
  );

  // Separate GeoJSON source for the selected hexagon.
  // Selection is restricted to cells in the city layer.
  map.addSource("h3-selected", {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
  });

  map.addLayer({
    id: "h3-selected-glow",
    type: "line",
    source: "h3-selected",
    layout: { "line-join": "round" },
    paint: {
      "line-color": "#405c4a",
      "line-width": 6,
      "line-blur": 1.5,
      "line-opacity": 0.28,
    },
  });

  map.addLayer({
    id: "h3-hexes-selected",
    type: "line",
    source: "h3-selected",
    paint: {
      "line-color": "#405c4a",
      "line-width": 2,
      "line-opacity": 0.85,
    },
  });

  // Routes of the selected hexagon. The source starts empty and is filled
  // after the backend request finishes.
  map.addSource("routes", {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
  });

  // White casing under the line keeps routes readable on top of the hexagons.
  map.addLayer({
    id: "routes-casing",
    type: "line",
    source: "routes",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": "#FFFFFF",
      "line-opacity": 0.85,
      "line-width": ["interpolate", ["linear"], ["zoom"], 10, 3, 16, 8],
    },
  });

  map.addLayer({
    id: "routes-line",
    type: "line",
    source: "routes",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": "#718679",
      "line-opacity": 0.85,
      "line-width": ["interpolate", ["linear"], ["zoom"], 10, 1.5, 16, 4],
    },
  });
  // Selection stays legible even where transit lines cross its boundary.
  map.moveLayer("h3-selected-glow");
  map.moveLayer("h3-hexes-selected");

  map.addSource("h3-comparison", {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
  });
  map.addLayer({
    id: "h3-comparison-glow",
    type: "line",
    source: "h3-comparison",
    layout: { "line-join": "miter" },
    paint: {
      "line-color": ["get", "color"],
      "line-width": 10,
      "line-blur": 4,
      "line-opacity": 0.42,
    },
  });
  map.addLayer({
    id: "h3-comparison-outline",
    type: "line",
    source: "h3-comparison",
    layout: { "line-join": "miter" },
    paint: {
      "line-color": ["get", "color"],
      "line-width": 4,
    },
  });

  // Stops inside the selected hexagon. The request also returns the rest of each route.
  map.addSource("stops", {
    type: "geojson",
    data: emptyStopsGeoJSON(),
  });

  map.addImage("stop-pin", stopPinImage(), { pixelRatio: 2 });

  map.addLayer({
    id: "stops-pin",
    type: "symbol",
    source: "stops",
    layout: {
      "icon-image": "stop-pin",
      "icon-anchor": "center",
      "icon-allow-overlap": true,
      "icon-ignore-placement": true,
      "icon-size": [
        "interpolate",
        ["exponential", 1.5],
        ["zoom"],
        10,
        0.16,
        12,
        0.24,
        13.5,
        0.4,
        16,
        0.68,
        18,
        0.9,
      ],
    },
  });

  let hoveredStopId: number | null = null;
  const hideNameTag = () => {
    stopNameTagRef.current?.remove();
    stopNameTagRef.current = null;
    hoveredStopId = null;
  };

  map.on("mousemove", "stops-pin", (event) => {
    canvas.style.cursor = "pointer";
    if (stopPopupRef.current) return;
    const feature = event.features?.[0] as unknown as StopHit | undefined;
    const stopId = Number(feature?.properties?.id);
    const stop = stopsByIdRef.current.get(stopId);
    const coordinates = feature ? pointCoordinates(feature.geometry) : null;
    if (!feature || !stop || !coordinates || hoveredStopId === stopId) return;
    hideNameTag();
    hoveredStopId = stopId;
    const nameTag = new mapboxgl.Popup({
      className: "stop-nametag",
      closeButton: false,
      closeOnClick: false,
      anchor: "bottom",
      offset: [0, -14],
      maxWidth: "180px",
    })
      .setLngLat(coordinates)
      .setDOMContent(stopNameTagNode(stop.name))
      .addTo(map);
    stopNameTagRef.current = nameTag;
  });
  map.on("mouseleave", "stops-pin", () => {
    canvas.style.cursor = "default";
    hideNameTag();
  });
}
