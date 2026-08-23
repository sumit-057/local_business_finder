"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  Accessibility,
  Armchair,
  Bike,
  Clock,
  CreditCard,
  Globe,
  Heart,
  Mail,
  Navigation,
  Phone,
  Share2,
  ShoppingBag,
  Tag,
  UtensilsCrossed,
  Wifi,
} from "lucide-react";
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
import { categoryGradientClass, CategoryIcon } from "@/lib/category-icons";
import { toggleFavorite, useFavorites } from "@/lib/local-store";
import { cn } from "@/lib/utils";

const PlaceMiniMap = dynamic(() => import("@/components/map/place-mini-map"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-xl" />,
});

interface DetailPayload {
  place: Place;
  enrichment: PlaceEnrichment;
  photoUrl?: string;
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

const WHEELCHAIR_LABELS: Record<string, string> = {
  yes: "accessible",
  limited: "partially accessible",
  no: "not accessible",
};

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
  /** One live request per key; a newer run supersedes an older one. */
  const controllersRef = useRef(new Map<string, AbortController>());
  const cacheKey = `${osmType}/${osmId}#${attempt}`;

  useEffect(() => {
    if (!open || entries[cacheKey]) return;
    // Take over from any superseded request for this key.
    controllersRef.current.get(cacheKey)?.abort();
    const controller = new AbortController();
    controllersRef.current.set(cacheKey, controller);

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
        // Superseded or abandoned requests stay silent and retryable.
        if ((e as Error).name === "AbortError") return;
        setEntries((prev) => ({ ...prev, [cacheKey]: { status: "error" } }));
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, cacheKey]);

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
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());
  const volunteerPhoto = enrichment?.imageUrl;
  const wikiPhoto =
    entry?.status === "ready" ? entry.payload?.photoUrl : undefined;
  const photoSrc = volunteerPhoto || wikiPhoto || null;
  const imgSrc =
    photoSrc && /^https?:\/\//i.test(photoSrc) && !brokenImages.has(photoSrc)
      ? photoSrc
      : null;

  const directionsUrl = place
    ? `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lon}`
    : null;
  const osmUrl = `https://www.openstreetmap.org/${osmType}/${osmId}`;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
        {/* Pure skeleton only when we know nothing about the place yet;
            otherwise content renders instantly and extras stream in. */}
        {status === "loading" && !place && (
          <div className="flex flex-col gap-3 p-4">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <p className="text-xs text-muted-foreground">Loading place…</p>
          </div>
        )}

        {(status === "error" || status === "missing") && !place && (
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

        {place && (
          <>
            {imgSrc && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imgSrc}
                alt={`Photo of ${place.name}`}
                className="h-44 w-full shrink-0 border-b border-border object-cover"
                onError={() =>
                  setBrokenImages((prev) => new Set(prev).add(imgSrc))
                }
              />
            )}
            {imgSrc && !volunteerPhoto && (
              <p className="px-4 pt-1 text-[10px] text-muted-foreground/70">
                Photo of the area · via Wikipedia · CC
              </p>
            )}
            <SheetHeader className="pb-2 pr-10">
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-linear-to-br text-primary-foreground",
                    categoryGradientClass(place.category),
                  )}
                >
                  <CategoryIcon placeCategory={place.category} />
                </div>
                <SheetTitle className="min-w-0 flex-1 pt-1 text-lg leading-snug font-semibold tracking-tight">
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

              {/* Contact tiles */}
              {(enrichment?.phone ||
                enrichment?.email ||
                enrichment?.website) && (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {enrichment.phone && (
                    <a
                      href={`tel:${enrichment.phone.replace(/\s+/g, "")}`}
                      className="surface-glass flex items-center gap-2.5 rounded-xl p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40"
                    >
                      <Phone className="size-4 shrink-0 text-primary" aria-hidden />
                      <span className="min-w-0">
                        <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
                          Phone
                        </span>
                        <span className="block truncate text-sm font-medium">
                          {enrichment.phone}
                        </span>
                      </span>
                    </a>
                  )}
                  {enrichment.email && (
                    <a
                      href={`mailto:${enrichment.email}`}
                      className="surface-glass flex items-center gap-2.5 rounded-xl p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40"
                    >
                      <Mail className="size-4 shrink-0 text-primary" aria-hidden />
                      <span className="min-w-0">
                        <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
                          Email
                        </span>
                        <span className="block truncate text-sm font-medium">
                          {enrichment.email}
                        </span>
                      </span>
                    </a>
                  )}
                  {enrichment.website && (
                    <a
                      href={enrichment.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="surface-glass flex items-center gap-2.5 rounded-xl p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 sm:col-span-2"
                    >
                      <Globe className="size-4 shrink-0 text-primary" aria-hidden />
                      <span className="min-w-0">
                        <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
                          Website
                        </span>
                        <span className="block truncate text-sm font-medium text-primary">
                          {enrichment.website.replace(/^https?:\/\//, "")}
                        </span>
                      </span>
                    </a>
                  )}
                  {enrichment.socials?.map(({ platform, url }) => (
                    <a
                      key={platform}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="surface-glass flex items-center gap-2.5 rounded-xl p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40"
                    >
                      <Share2
                        className="size-4 shrink-0 text-primary"
                        aria-hidden
                      />
                      <span className="min-w-0">
                        <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
                          {platform}
                        </span>
                        <span className="block truncate text-sm font-medium text-primary">
                          {url.replace(/^https?:\/\/(www\.)?/, "")}
                        </span>
                      </span>
                    </a>
                  ))}
                </div>
              )}

              {enrichment?.cuisine && (
                <p className="flex items-center gap-2.5 text-sm">
                  <UtensilsCrossed
                    className="size-4 shrink-0 text-primary"
                    aria-hidden
                  />
                  {enrichment.cuisine}
                </p>
              )}

              {enrichment?.wheelchair && (
                <p className="flex items-center gap-2.5 text-sm">
                  <Accessibility
                    className="size-4 shrink-0 text-primary"
                    aria-hidden
                  />
                  Wheelchair{" "}
                  {WHEELCHAIR_LABELS[enrichment.wheelchair] ??
                    enrichment.wheelchair.toLowerCase()}
                </p>
              )}

              {enrichment?.brand && (
                <p className="flex items-center gap-2.5 text-sm">
                  <Tag className="size-4 shrink-0 text-primary" aria-hidden />
                  <span className="truncate">{enrichment.brand}</span>
                </p>
              )}

              {enrichment?.internet && (
                <p className="flex items-center gap-2.5 text-sm">
                  <Wifi className="size-4 shrink-0 text-primary" aria-hidden />
                  Internet access: {enrichment.internet}
                </p>
              )}

              {(enrichment?.hasOutdoorSeating ||
                enrichment?.offersTakeaway ||
                enrichment?.offersDelivery) && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {enrichment.hasOutdoorSeating && (
                    <Badge
                      variant="secondary"
                      className="rounded-full px-2 py-0 text-[11px]"
                    >
                      <Armchair className="mr-1 size-3" aria-hidden />
                      Outdoor seating
                    </Badge>
                  )}
                  {enrichment.offersTakeaway && (
                    <Badge
                      variant="secondary"
                      className="rounded-full px-2 py-0 text-[11px]"
                    >
                      <ShoppingBag className="mr-1 size-3" aria-hidden />
                      Takeaway
                    </Badge>
                  )}
                  {enrichment.offersDelivery && (
                    <Badge
                      variant="secondary"
                      className="rounded-full px-2 py-0 text-[11px]"
                    >
                      <Bike className="mr-1 size-3" aria-hidden />
                      Delivery
                    </Badge>
                  )}
                </div>
              )}

              {enrichment?.payments && (
                <p className="flex items-center gap-2.5 text-sm">
                  <CreditCard
                    className="size-4 shrink-0 text-primary"
                    aria-hidden
                  />
                  Accepts {enrichment.payments.join(", ")}
                </p>
              )}

              {status === "loading" && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Skeleton className="size-3 rounded-full" />
                  Loading extra details…
                </div>
              )}

              {(status === "error" || status === "missing") && (
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-accent/40 p-2.5">
                  <p className="min-w-0 flex-1 text-xs leading-relaxed text-muted-foreground">
                    {status === "missing"
                      ? "Extra details are unavailable for this place."
                      : "Extra details didn't load just now."}
                  </p>
                  {status === "error" && (
                    <Button variant="secondary" size="xs" onClick={retry}>
                      Retry
                    </Button>
                  )}
                </div>
              )}

              {!(
                status === "loading" ||
                status === "error" ||
                status === "missing" ||
                enrichment?.phone ||
                enrichment?.email ||
                enrichment?.website ||
                enrichment?.openingHours ||
                enrichment?.cuisine ||
                enrichment?.wheelchair ||
                enrichment?.brand ||
                enrichment?.internet ||
                enrichment?.hasOutdoorSeating ||
                enrichment?.offersTakeaway ||
                enrichment?.offersDelivery ||
                enrichment?.payments
              ) && (
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
                    nativeButton={false}
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
                  nativeButton={false}
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
