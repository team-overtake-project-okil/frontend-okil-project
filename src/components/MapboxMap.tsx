import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const token = import.meta.env.VITE_MAPBOX_TOKEN;

interface MapboxMapProps {
  searchedLocation?: { lat: number; lng: number } | null;
}

export function MapboxMap({ searchedLocation }: MapboxMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null); 
  const markerRef = useRef<mapboxgl.Marker | null>(null); 

  useEffect(() => {
    if (!mapContainer.current || !token || mapRef.current) return;

    mapRef.current = new mapboxgl.Map({
      container: mapContainer.current,
      accessToken: token,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [24.0316, 49.8429],
      zoom: 12,
    });

    mapRef.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !searchedLocation) return;

    const { lng, lat } = searchedLocation;

    mapRef.current.flyTo({
      center: [lng, lat],
      zoom: 15,
      essential: true
    });

    if (markerRef.current) {
      markerRef.current.setLngLat([lng, lat]);
    } else {
      markerRef.current = new mapboxgl.Marker({ color: "#2563eb" })
        .setLngLat([lng, lat])
        .addTo(mapRef.current);
    }
  }, [searchedLocation]);

  if (!token) {
    return <p>Mapbox token is missing.</p>;
  }

  return (
    <div
      ref={mapContainer}
      className="h-[500px] w-full overflow-hidden rounded-2xl"
    />
  );
}