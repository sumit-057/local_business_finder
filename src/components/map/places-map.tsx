"use client";

import { useEffect, useMemo } from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { Place } from "@/lib/place";
import { boundsForPlaces } from "@/lib/map-bounds";
import { highlightStateFor } from "@/lib/highlight";

export interface PlacesMapProps {
  places: Place[];
  hoveredId: string | null;
  selectedId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}

/** Neutral starting viewport; the first result set immediately refits it. */
const DEFAULT_MAP_CENTER: L.LatLngTuple = [18.5204, 73.8567];

function pinIcon(state: string): L.DivIcon {
  const modifier = state === "idle" ? "" : ` is-${state}`;
  return L.divIcon({
    className: "place-pin-anchor",
    html: `<span class="place-pin${modifier}"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

/** Re-fits the viewport whenever the result set itself changes. */
function FitToPlaces({ places }: { places: Place[] }) {
  const map = useMap();
  const boundsKey = useMemo(() => places.map((p) => p.id).join("|"), [places]);

  useEffect(() => {
    if (!boundsKey) return;
    const bounds = boundsForPlaces(places);
    if (!bounds) return;
    map.fitBounds(bounds, { padding: [36, 36], maxZoom: 15 });
    // Re-fit only when the identity of the results changes, never on hover.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boundsKey, map]);

  return null;
}

/** Leaflet cannot observe CSS-driven size changes; nudge it ourselves. */
function InvalidateOnResize() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);

  return null;
}

export function PlacesMap({
  places,
  hoveredId,
  selectedId,
  onHover,
  onSelect,
}: PlacesMapProps) {
  return (
    <MapContainer
      center={DEFAULT_MAP_CENTER}
      zoom={12}
      scrollWheelZoom
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        className="map-tiles"
      />
      <FitToPlaces places={places} />
      <InvalidateOnResize />
      {places.map((p) => (
        <Marker
          key={p.id}
          position={[p.lat, p.lon]}
          icon={pinIcon(highlightStateFor(p.id, hoveredId, selectedId))}
          zIndexOffset={
            p.id === hoveredId || p.id === selectedId ? 1000 : 0
          }
          eventHandlers={{
            mouseover: () => onHover(p.id),
            mouseout: () => onHover(null),
            click: () => onSelect(p.id),
          }}
          alt={p.name}
        />
      ))}
    </MapContainer>
  );
}

export default PlacesMap;
