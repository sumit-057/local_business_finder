"use client";

import { MapContainer, Marker, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { pinIcon } from "@/components/map/pin-icon";

/**
 * Static-style map preview for the detail sheet: a single pinned
 * viewport with all interaction disabled.
 */
export function PlaceMiniMap({
  lat,
  lon,
  name,
}: {
  lat: number;
  lon: number;
  name: string;
}) {
  return (
    <MapContainer
      center={[lat, lon]}
      zoom={16}
      zoomControl={false}
      scrollWheelZoom={false}
      doubleClickZoom={false}
      dragging={false}
      keyboard={false}
      touchZoom={false}
      boxZoom={false}
      attributionControl={false}
      className="h-full w-full"
    >
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        className="map-tiles"
      />
      <Marker position={[lat, lon]} icon={pinIcon("selected")} alt={name} />
    </MapContainer>
  );
}

export default PlaceMiniMap;
