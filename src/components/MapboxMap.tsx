import { useCallback, useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { cellToBoundary, gridDistance, polygonToCells } from "h3-js";
import cityBoundary from "../data/lviv-city.json";
import { H3_RES, coordsToH3 } from "../lib/h3";

const token = import.meta.env.VITE_MAPBOX_TOKEN;

const LVIV_LAT = 49.8429;
const LVIV_LNG = 24.0316;

// Administrative boundary of the city of Lviv (OSM relation 2032280).
function lvivHexes() {
  const origin = coordsToH3(LVIV_LAT, LVIV_LNG);
  const cells = polygonToCells(cityBoundary.coordinates, H3_RES, true);
  const maxSteps = Math.max(...cells.map((id) => gridDistance(origin, id)));

  return {
    type: "FeatureCollection" as const,
    features: cells.map((id) => {
      const steps = gridDistance(origin, id);
      const score =
        maxSteps === 0 ? 100 : Math.round(100 * (1 - steps / maxSteps));
      return {
        type: "Feature" as const,
        properties: { id, score },
        geometry: {
          type: "Polygon" as const,
          coordinates: [cellToBoundary(id, true)],
        },
      };
    }),
  };
}

interface MapboxMapProps {
  searchedLocation?: { lat: number; lng: number } | null;
  onHexSelect?: (hexId: string) => void;
}

export function MapboxMap({ searchedLocation, onHexSelect }: MapboxMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const onHexSelectRef = useRef(onHexSelect);

  // Keep the latest callback without recreating the Mapbox map.
  useEffect(() => {
    onHexSelectRef.current = onHexSelect;
  }, [onHexSelect]);

  // Select the H3 cell corresponding to the searched address.
  const selectHex = useCallback((lat: number, lng: number) => {
    const map = mapRef.current;
    if (!map) return;

    const source = map.getSource("h3-selected") as
      mapboxgl.GeoJSONSource | undefined;
    if (!source) return;

    const hexId = coordsToH3(lat, lng);
    console.log("H3 Hexagon ID:", hexId);

    source.setData({
      type: "Feature",
      properties: { id: hexId },
      geometry: {
        type: "Polygon",
        coordinates: [cellToBoundary(hexId, true)],
      },
    });

    onHexSelectRef.current?.(hexId);
  }, []);

  useEffect(() => {
    if (!mapContainer.current || !token || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      accessToken: token,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [LVIV_LNG, LVIV_LAT],
      zoom: 12,
    });

    mapRef.current = map;

    const canvas = map.getCanvas();
    canvas.style.cursor = "default";

    const onMouseDown = () => {
      canvas.style.cursor = "move";
    };
    const onMouseUp = () => {
      canvas.style.cursor = "default";
    };

    map.on("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);

    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.on("click", (e) => {
      const hexId = coordsToH3(e.lngLat.lat, e.lngLat.lng);
  
      map.flyTo({
        center: [e.lngLat.lng, e.lngLat.lat],
        zoom: 13,
        essential: true,
      });

      console.log(hexId);
      selectHex(e.lngLat.lat, e.lngLat.lng);
    });

    map.on("load", () => {
      const hexes = lvivHexes();

      map.addSource("h3-hexes", {
        type: "geojson",
        data: hexes,
      });

      const bounds = new mapboxgl.LngLatBounds();
      for (const [lng, lat] of cityBoundary.coordinates[0]) {
        bounds.extend([lng, lat]);
      }
      map.fitBounds(bounds, { padding: 24, duration: 0 });

      map.addLayer({
        id: "h3-hexes-fill",
        type: "fill",
        source: "h3-hexes",
        paint: {
          "fill-color": [
            "interpolate",
            ["linear"],
            ["get", "score"],
            0,
            "#FF3B30",
            50,
            "#FFCC00",
            100,
            "#34C759",
          ],
          //побавитись з опасіті
          "fill-opacity": 0.5,
        },
      });

      map.addLayer({
        id: "h3-hexes-line",
        type: "line",
        source: "h3-hexes",
        paint: {
          "line-color": "#1C1C1E",
          "line-width": 1,
          "line-opacity": 0.4,
        },
      });

      // Separate GeoJSON source for the selected hexagon.
      // It is independent of the mock score layer and also works outside the city boundary.
      map.addSource("h3-selected", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: "h3-selected-fill",
        type: "fill",
        source: "h3-selected",
        paint: {
          "fill-color": "#007AFF",
          "fill-opacity": 0.3,
        },
      });

      map.addLayer({
        id: "h3-hexes-selected",
        type: "line",
        source: "h3-selected",
        paint: {
          "line-color": "#007AFF",
          "line-width": 3,
        },
      });
    });

    return () => {
      window.removeEventListener("mouseup", onMouseUp);
      markerRef.current?.remove();
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [selectHex]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !searchedLocation) return;

    const { lng, lat } = searchedLocation;

    map.flyTo({
      center: [lng, lat],
      zoom: 15,
      essential: true,
    });

    if (markerRef.current) {
      markerRef.current.setLngLat([lng, lat]);
    } else {
      markerRef.current = new mapboxgl.Marker({ color: "#2563eb" })
        .setLngLat([lng, lat])
        .addTo(map);
    }

    // Sources are only available after the initial Mapbox style load.
    if (map.getSource("h3-selected")) {
      selectHex(lat, lng);
    } else {
      const onLoad = () => selectHex(lat, lng);
      map.once("load", onLoad);
      return () => {
        map.off("load", onLoad);
      };
    }
  }, [searchedLocation, selectHex]);

  if (!token) {
    return <p>Mapbox token is missing.</p>;
  }

  return (
    <div
      ref={mapContainer}
      className="h-125 w-full overflow-hidden rounded-2xl"
    />
  );
}
