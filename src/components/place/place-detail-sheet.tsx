"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Clock, Globe, Heart, Navigation, Phone } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import type { OsmType, Place, PlaceEnrichment } from "@/lib/place";
import { toggleFavorite, useFavorites } from "@/lib/local-store";
import { cn } from "@/lib/utils";

const PlaceMiniMap = dynamic(() => import("@/components/map/place-mini-map"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-xl" />,
});

interface DetailPayload {
  place: Place;
  enrichment: PlaceEnrichment;
}

/** One enrichment lookup outcome, cached per place+attempt. */
interface Entry {
  status: "ready" | "error" | "missing";
  payload?: DetailPayload;
}

function prettyCategory(category: string | null): string {
  if (!category) return "Place";
  const tail = category.split("/").pop() ?? "place";
  return tail.replace(/_/g, " ");
}

function formatCoords(lat: number, lon: number): string {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(5)}° ${ns}, ${Math.abs(lon).toFixed(5)}° ${ew}`;
}

/**
 * The detail slide-over: full-screen sheet on mobile, side panel over
 * the split view on desktop. Enrichment sections render only when
 * OSM volunteers tagged them — never nulls.
 */
export function PlaceDetailSheet({
  open,
  osmType,
  osmId,
  fallbackPlace,
  onClose,
}: {
  open: boolean;
  osmType: OsmType;
  osmId: number;
  /** Place already known from the results list, before enrichment lands. */
  fallbackPlace?: Place | null;
  onClose: () => void;
}) {
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const [attempt, setAttempt] = useState(0);
  /** Keys already fetched or in flight — guards without retriggering. */
  const inFlightRef = useRef<Set<string>>(new Set());
  const cacheKey = `${osmType}/${osmId}#${attempt}`;

  useEffect(() => {
    if (!open || inFlightRef.current.has(cacheKey)) return;
    inFlightRef.current.add(cacheKey);
    const controller = new AbortController();

    fetch(`/api/place/${osmType}/${osmId}`, { signal: controller.signal })
      .then(async (res) => {
        const body = (await res.json()) as DetailPayload & {
          error?: { code: string };
        };
        const next: Entry = !res.ok
          ? { status: body.error?.code === "not_found" ? "missing" : "error" }
          : {
              status: "ready",
              payload: { place: body.place, enrichment: body.enrichment },
            };
        setEntries((prev) => ({ ...prev, [cacheKey]: next }));
      })
      .catch((e: unknown) => {
        if ((e as Error).name === "AbortError") {
          // Abandoned lookup must be retryable on the next open.
          inFlightRef.current.delete(cacheKey);
          return;
        }
        setEntries((prev) => ({ ...prev, [cacheKey]: { status: "error" } }));
      });

    return () => controller.abort();
  }, [open, osmType, osmId, attempt, cacheKey]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  const entry = open ? entries[cacheKey] : undefined;
  const status: "idle" | "loading" | Entry["status"] =
    !open ? "idle" : (entry?.status ?? "loading");

  // List context wins while fresh; enrichment fills the rest.
  const place =
    entry?.status === "ready" && entry.payload
      ? entry.payload.place
      : (fallbackPlace ?? null);
  const enrichment =
    entry?.status === "ready" && entry.payload ? entry.payload.enrichment : null;

  const favorites = useFavorites();
  const favorite = place ? favorites.some((p) => p.id === place.id) : false;

  const directionsUrl = place
    ? `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lon}`
    : null;
  const osmUrl = `https://www.openstreetmap.org/${osmType}/${osmId}`;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
        {status === "loading" && (
          <div className="flex flex-col gap-3 p-4">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <p className="text-xs text-muted-foreground">Loading place…</p>
          </div>
        )}

        {(status === "error" || status === "missing") && (
          <div className="flex flex-col items-start gap-3 p-4">
            <SheetTitle>
              {status === "missing"
                ? "This place isn't in the map data anymore."
                : "Couldn't load this place."}
            </SheetTitle>
            <SheetDescription>
              {status === "missing"
                ? "Volunteer map data changes constantly; the link may be stale."
                : "The map data service didn't answer. It's usually momentary."}
            </SheetDescription>
            {status === "error" && (
              <Button variant="secondary" size="sm" onClick={retry}>
                Retry
              </Button>
            )}
          </div>
        )}

        {status === "ready" && place && (
          <>
            <SheetHeader className="pb-2 pr-10">
              <div className="flex items-start justify-between gap-2">
                <SheetTitle className="text-lg font-semibold tracking-tight">
                  {place.name}
                </SheetTitle>
                <button
                  type="button"
                  onClick={() => toggleFavorite(place)}
                  aria-pressed={favorite}
                  aria-label={
                    favorite
                      ? `Remove ${place.name} from favorites`
                      : `Save ${place.name} to favorites`
                  }
                  className="shrink-0 rounded-full p-1.5 text-muted-foreground transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Heart
                    className={cn(
                      "size-5 transition-transform hover:scale-110",
                      favorite && "fill-primary text-primary",
                    )}
                    aria-hidden
                  />
                </button>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {place.category && (
                  <Badge
                    variant="secondary"
                    className="rounded-full px-2 py-0 text-[11px] capitalize"
                  >
                    {prettyCategory(place.category)}
                  </Badge>
                )}
                {enrichment?.openingHours && (
                  <Badge
                    variant="secondary"
                    className="rounded-full px-2 py-0 text-[11px]"
                  >
                    <Clock className="mr-1 size-3" aria-hidden />
                    {enrichment.openingHours}
                  </Badge>
                )}
              </div>
              {place.address && (
                <SheetDescription className="mt-1.5 leading-relaxed">
                  {place.address}
                </SheetDescription>
              )}
            </SheetHeader>

            <div className="h-44 w-full shrink-0 overflow-hidden border-y border-border">
              <PlaceMiniMap lat={place.lat} lon={place.lon} name={place.name} />
            </div>

            <div className="flex flex-col gap-4 p-4">
              <p className="font-mono text-xs text-muted-foreground">
                {formatCoords(place.lat, place.lon)}
              </p>

              {enrichment?.phone && (
                <a
                  href={`tel:${enrichment.phone.replace(/\s+/g, "")}`}
                  className="flex items-center gap-2.5 text-sm transition-colors hover:text-primary"
                >
                  <Phone className="size-4 text-primary" aria-hidden />
                  {enrichment.phone}
                </a>
              )}

              {enrichment?.website && (
                <a
                  href={enrichment.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-w-0 items-center gap-2.5 text-sm transition-colors hover:text-primary"
                >
                  <Globe className="size-4 shrink-0 text-primary" aria-hidden />
                  <span className="truncate">{enrichment.website}</span>
                </a>
              )}

              {!enrichment?.phone && !enrichment?.website && !enrichment?.openingHours && (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  No contact details have been tagged for this place yet — the
                  map data is volunteer-maintained.
                </p>
              )}

              <Separator />

              <div className="flex flex-wrap gap-2">
                {directionsUrl && (
                  <Button
                    size="sm"
                    render={
                      <a href={directionsUrl} target="_blank" rel="noopener noreferrer" />
                    }
                  >
                    <Navigation className="size-4" aria-hidden />
                    Directions
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  render={<a href={osmUrl} target="_blank" rel="noopener noreferrer" />}
                >
                  View on OpenStreetMap
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
