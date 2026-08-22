"use client";

import dynamic from "next/dynamic";
import type { PlacesMapProps } from "@/components/map/places-map";

const PlacesMap = dynamic(() => import("@/components/map/places-map"), {
  ssr: false,
  loading: () => (
    <div
      className="flex h-full w-full items-center justify-center bg-background/60"
      aria-hidden
    >
      <div className="size-8 animate-pulse rounded-full bg-accent" />
    </div>
  ),
});

/**
 * Framed live-map pane: free OSM raster tiles behind one pin per Place,
 * hover- and selection-synced with the card list.
 */
export function MapPane(props: PlacesMapProps) {
  return (
    <div className="surface-glass isolate relative h-[62svh] min-h-72 overflow-hidden rounded-2xl lg:h-[620px]">
      <PlacesMap {...props} />
    </div>
  );
}
