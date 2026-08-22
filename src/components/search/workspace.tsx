"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, MotionConfig } from "motion/react";
import { Heart, LocateFixed, X } from "lucide-react";
import { PlaceCard } from "@/components/place/place-card";
import { PlaceDetailSheet } from "@/components/place/place-detail-sheet";
import { SearchBox } from "@/components/search/search-box";
import { SearchPalette } from "@/components/search/search-palette";
import {
  EmptyState,
  ErrorState,
  LocationDeniedState,
  SkeletonGrid,
} from "@/components/search/states";
import { AppShell, RegionPlaceholder } from "@/components/layout/app-shell";
import { HeroAnimation } from "@/components/brand/hero-animation";
import { MapPane } from "@/components/map/map-pane";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CATEGORIES, matchPlaceCategory } from "@/lib/categories";
import { DEFAULT_QUERY } from "@/lib/categories";
import {
  addRecentSearch,
  removeFavorite,
  toggleFavorite,
  useFavorites,
  useRecentSearches,
} from "@/lib/local-store";
import { highlightStateFor, placeCardElementId } from "@/lib/highlight";
import { extractPlacePhrase } from "@/lib/smart-query";
import { CategoryIcon, categoryGradientClass } from "@/lib/category-icons";
import { cn } from "@/lib/utils";
import type { OsmType, Place } from "@/lib/place";

type Status = "loading" | "success" | "empty" | "error";

const PAGE_SIZE = 12;

interface SearchPayload {
  query: string;
  category: string | null;
  fellBackToPlace?: string;
  places?: Place[];
}

interface NearbyPayload {
  category: string;
  origin: { lat: number; lon: number };
  places?: Place[];
}

/** Device geolocation as a promise; null on denial/unavailability. */
function getDevicePosition(): Promise<GeolocationCoordinates | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos.coords),
      () => resolve(null),
      { timeout: 8_000, maximumAge: 300_000 },
    );
  });
}

/** Coarse server-side IP location; null when it can't be resolved. */
async function getIpLocation(): Promise<{
  lat: number;
  lon: number;
  city?: string;
} | null> {
  try {
    const res = await fetch("/api/geo", { signal: AbortSignal.timeout(6_000) });
    const body = (await res.json()) as { location?: { lat: number; lon: number; city?: string } | null };
    return body.location ?? null;
  } catch {
    return null;
  }
}

export function Workspace({
  initialQuery,
  detail,
  preferLocation = false,
}: {
  initialQuery: string;
  /** Present on direct loads of /place/[osmType]/[id]: open the slide-over. */
  detail?: { osmType: OsmType; osmId: number };
  /** Landing page mode: try the visitor's location before any default query. */
  preferLocation?: boolean;
}) {
  const [status, setStatus] = useState<Status>(initialQuery ? "loading" : "success");
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState<string | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(
    detail ? `${detail.osmType}/${detail.osmId}` : null,
  );
  /** "<osmType>/<osmId>" of the open detail slide-over, if any. */
  const [detailKey, setDetailKey] = useState<string | null>(
    detail ? `${detail.osmType}/${detail.osmId}` : null,
  );
  /** True when we pushed a /place/... entry that back-navigation owns. */
  const pushedRef = useRef(false);
  const [mobileView, setMobileView] = useState<"list" | "map">("list");
  const favorites = useFavorites();
  const recentSearches = useRecentSearches();
  /** True when the current results came from a Near Me radius search. */
  const [nearby, setNearby] = useState(false);
  /** Which flow an error-state retry should re-run. */
  const [mode, setMode] = useState<"search" | "nearby">("search");
  const [locating, setLocating] = useState(false);
  const [geoDenied, setGeoDenied] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  /** The city part of the last Smart Query — chips re-target it. */
  const [lastPlace, setLastPlace] = useState<string | null>(null);
  const [fellBackToPlace, setFellBackToPlace] = useState<string | null>(null);
  /** Category key filtering the current Nearby results (null = all). */
  const [nearbyFilter, setNearbyFilter] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  /** City label for IP-based Nearby results, when known. */
  const [nearbyCity, setNearbyCity] = useState<string | null>(null);
  /** The Category a Near Me search should radius around. */
  const activeCategory =
    CATEGORIES.find((c) => category === c.label) ?? CATEGORIES.find((c) => c.key === "cafe")!;
  const abortRef = useRef<AbortController | null>(null);

  /** Brings the results region into view after a fresh search lands. */
  const scrollToResults = useCallback(() => {
    requestAnimationFrame(() => {
      document
        .getElementById("results")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  const runSearch = useCallback(
    async (q: string, opts?: { scroll?: boolean }) => {
      const text = q.trim();
      if (!text) return;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

    setStatus("loading");
    setQuery(text);
    setCategory(null);
    setHoveredId(null);
    setSelectedId(null);
    setNearby(false);
    setMode("search");
    setFellBackToPlace(null);
    setNearbyFilter(null);
    setVisibleCount(PAGE_SIZE);
    window.history.replaceState(null, "", `/search?q=${encodeURIComponent(text)}`);

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(text)}`, {
        signal: controller.signal,
      });
      const body = (await res.json()) as SearchPayload;
      if (!res.ok) {
        setStatus("error");
        return;
      }
      setPlaces(body.places ?? []);
      setCategory(body.category);
      // Remember the city so Category chips can re-target it — even when
      // the subject wasn't a known Category.
      setLastPlace(extractPlacePhrase(text));
      setFellBackToPlace(body.fellBackToPlace ?? null);
      addRecentSearch(text);
      setStatus((body.places?.length ?? 0) > 0 ? "success" : "empty");
      if (opts?.scroll !== false) scrollToResults();
    } catch (e) {
      if ((e as Error).name !== "AbortError") setStatus("error");
    }
  },
  [scrollToResults]);

  /**
   * Radius-searches every common Category around one position. One
   * upstream query; the visitor filters the result set locally.
   */
  const runNearbyAt = useCallback(
    async (
      lat: number,
      lon: number,
      opts?: { city?: string; scroll?: boolean },
    ) => {
      const controller = new AbortController();
      abortRef.current = controller;
      setStatus("loading");
      setMode("nearby");
      setLocating(false);
      setHoveredId(null);
      setSelectedId(null);
      setFellBackToPlace(null);
      setVisibleCount(PAGE_SIZE);
      setQuery(opts?.city ? `near ${opts.city}` : "near you");
      setNearbyCity(opts?.city ?? null);
      try {
        const res = await fetch(
          `/api/nearby?lat=${lat}&lon=${lon}&category=all`,
          { signal: controller.signal },
        );
        if (!res.ok) {
          setStatus("error");
          return;
        }
        const body = (await res.json()) as NearbyPayload;
        setPlaces(body.places ?? []);
        setCategory(body.category);
        setNearby(true);
        setNearbyFilter(
          (body.places ?? []).some(
            (p) => matchPlaceCategory(p.category)?.key === activeCategory.key,
          )
            ? activeCategory.key
            : null,
        );
        setStatus((body.places?.length ?? 0) > 0 ? "success" : "empty");
        if (opts?.scroll !== false) scrollToResults();
      } catch (e) {
        if ((e as Error).name !== "AbortError") setStatus("error");
      }
    },
    [activeCategory, scrollToResults],
  );

  /**
   * Near Me button: device GPS first, coarse IP location second, and a
   * designed fallback only when both fail — never a dead end.
   */
  const runNearby = useCallback(() => {
    abortRef.current?.abort();
    setGeoDenied(false);
    setLocating(true);
    getDevicePosition().then((coords) => {
      if (coords) {
        void runNearbyAt(coords.latitude, coords.longitude, {
          scroll: true,
        });
        return;
      }
      getIpLocation().then((ip) => {
        setLocating(false);
        if (ip) {
          void runNearbyAt(ip.lat, ip.lon, {
            city: ip.city || undefined,
            scroll: true,
          });
        } else {
          setGeoDenied(true);
        }
      });
    });
  }, [runNearbyAt]);

  // Mount-only bootstrap: shareable query, or location-first landing.
  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      if (initialQuery) {
        // Shareable /search?q=... loads: run the query, stay at the top.
        await runSearch(initialQuery, { scroll: false });
        return;
      }
      if (!preferLocation) return;
      // Landing page: try the visitor's location first, Pune only as a
      // last resort. Device GPS → coarse IP location → default query.
      setStatus("loading");
      const coords = await getDevicePosition();
      if (cancelled) return;
      if (coords) {
        await runNearbyAt(coords.latitude, coords.longitude, {
          scroll: false,
        });
        return;
      }
      const ip = await getIpLocation();
      if (cancelled) return;
      if (ip) {
        await runNearbyAt(ip.lat, ip.lon, { city: ip.city, scroll: false });
        return;
      }
      await runSearch(DEFAULT_QUERY, { scroll: false });
    };

    void bootstrap();
    return () => {
      cancelled = true;
      abortRef.current?.abort();
    };
    // Intentional mount-only bootstrap; all updates flow through the
    // async lifecycle functions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Hover raised from a pin: mirror onto the card and bring it into view. */
  const handleMapHover = useCallback((id: string | null) => {
    setHoveredId(id);
    if (id) {
      document
        .getElementById(placeCardElementId(id))
        ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, []);

  /** Opens the detail slide-over at its shareable /place/... URL. */
  const openDetail = useCallback((place: Place) => {
    setSelectedId(place.id);
    setDetailKey(place.id);
    if (!window.location.pathname.startsWith("/place/")) {
      window.history.pushState(
        null,
        "",
        `/place/${place.osmType}/${place.osmId}`,
      );
      pushedRef.current = true;
    }
  }, []);

  const closeDetail = useCallback(() => {
    setDetailKey(null);
    setSelectedId(null);
    if (pushedRef.current) {
      pushedRef.current = false;
      window.history.back(); // popstate handler finishes the cleanup.
    } else {
      // Direct load of /place/...: return to the search view in place.
      window.history.replaceState(null, "", `/search?q=${encodeURIComponent(query)}`);
    }
  }, [query]);

  // Browser back/close gestures dismiss the slide-over.
  useEffect(() => {
    const onPop = () => {
      pushedRef.current = false;
      setDetailKey(null);
      setSelectedId(null);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const searching = status === "loading";

  // The slide-over renders only for a well-formed detail key.
  const detailMatch = detailKey?.match(/^(node|way|relation)\/(\d+)$/);

  /** Nearby results can be narrowed to one Category without refetching. */
  const filteredPlaces =
    nearby && nearbyFilter
      ? places.filter(
          (p) => matchPlaceCategory(p.category)?.key === nearbyFilter,
        )
      : places;
  const nearbyCategories = nearby
    ? CATEGORIES.filter((c) =>
        places.some((p) => matchPlaceCategory(p.category)?.key === c.key),
      )
    : [];
  const visiblePlaces = filteredPlaces.slice(0, visibleCount);

  return (
    <MotionConfig reducedMotion="user">
    <AppShell
      search={
        <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-5 text-center">
          <div className="flex flex-col items-center gap-2">
            <HeroAnimation className="h-14 w-auto opacity-95" />
            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              Every corner, on{" "}
              <span className="text-shimmer bg-linear-to-r from-primary via-fuchsia-400 from-30% via-50% to-primary/70 bg-clip-text text-transparent">
                live map data
              </span>
            </h1>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
              Real places, contributed by real people — no listings, no ads.
              Ask naturally; we parse the rest.
            </p>
          </div>
          <div className="w-full">
            <SearchBox
              initialQuery={initialQuery}
              onSubmit={(q) => void runSearch(q)}
              busy={searching}
            />
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="flex flex-wrap items-center justify-center gap-2"
            aria-label="Category shortcuts"
          >
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                onClick={() =>
                  void runSearch(
                    lastPlace
                      ? `${c.aliases[0]} in ${lastPlace}`
                      : c.exampleQuery,
                  )
                }
                title={
                  lastPlace ? `${c.aliases[0]} in ${lastPlace}` : c.exampleQuery
                }
                className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Badge
                  variant="secondary"
                  className="cursor-pointer rounded-full px-3 py-1 text-xs transition-colors hover:border-primary/50 hover:text-primary"
                >
                  {c.label}
                </Badge>
              </button>
            ))}
          </motion.div>
          <Button
            variant="secondary"
            size="sm"
            className="rounded-full"
            onClick={runNearby}
            disabled={searching || locating}
            title={`Find ${activeCategory.label.toLowerCase()}s around your position`}
          >
            <LocateFixed
              className={`size-3.5${locating ? " animate-spin" : ""}`}
              aria-hidden
            />
            {locating ? "Locating…" : "Near Me"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full text-muted-foreground"
            onClick={() => setPaletteOpen(true)}
            title="Open the command palette"
          >
            Search <kbd className="font-sans text-[10px] tracking-widest">⌘K</kbd>
          </Button>
          {recentSearches.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="flex flex-wrap items-center justify-center gap-1.5"
              aria-label="Recent searches"
            >
              {recentSearches.map((q) => (
                <button
                  key={q}
                  onClick={() => void runSearch(q)}
                  className="rounded-full px-3 py-1 text-xs text-muted-foreground transition-colors outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
                >
                  ⏎ {q}
                </button>
              ))}
            </motion.div>
          )}
        </div>
      }
      results={
        <>
          {favorites.length > 0 && (
            <div className="mb-4">
              <p className="mb-2 flex items-center gap-1.5 px-1 text-xs font-medium text-muted-foreground">
                <Heart className="size-3.5 fill-primary text-primary" aria-hidden />
                Favorites
              </p>
              <div
                className="scrollbar-slim flex snap-x gap-2 overflow-x-auto pb-1"
                role="list"
                aria-label="Saved places"
              >
                {favorites.map((f) => (
                  <div
                    key={f.id}
                    role="listitem"
                    tabIndex={0}
                    onClick={() => openDetail(f)}
                    onKeyDown={(e) => e.key === "Enter" && openDetail(f)}
                    aria-label={`Open ${f.name}`}
                    className="surface-glass group relative w-56 shrink-0 cursor-pointer snap-start rounded-xl p-3 pr-7 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "flex size-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-linear-to-br text-primary-foreground",
                          categoryGradientClass(f.category),
                        )}
                      >
                        <CategoryIcon placeCategory={f.category} className="size-3.5" />
                      </div>
                      <span className="block truncate text-xs font-semibold">
                        {f.name}
                      </span>
                    </div>
                    <span className="mt-1 block truncate text-[11px] text-muted-foreground">
                      {f.address || f.category || f.id}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFavorite(f.id);
                      }}
                      aria-label={`Remove ${f.name} from favorites`}
                      className="absolute top-1.5 right-1.5 rounded-full p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100"
                    >
                      <X className="size-3" aria-hidden />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {geoDenied && !searching && (
            <LocationDeniedState onExample={(q) => void runSearch(q)} />
          )}
          {query && (
            <p className="mb-3 flex flex-wrap items-center gap-2 px-1 text-xs text-muted-foreground" aria-live="polite">
              <span>
                {status === "loading"
                  ? nearby
                    ? "Searching around you…"
                    : `Searching "${query}"…`
                  : nearby
                    ? `${filteredPlaces.length} place${filteredPlaces.length === 1 ? "" : "s"} near you${nearbyCity ? ` · ${nearbyCity}` : ""}`
                    : `${places.length} place${places.length === 1 ? "" : "s"} for "${query}"`}
              </span>
              {category && status === "success" && (
                <Badge className="rounded-full bg-accent px-2 py-0 text-[11px] text-primary">
                  {category}
                </Badge>
              )}
            </p>
          )}
          {fellBackToPlace && status !== "loading" && (
            <p className="mb-3 rounded-xl border border-border bg-accent/40 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
              No exact matches for &ldquo;{query}&rdquo; — showing the best of{" "}
              <span className="font-medium text-foreground">
                {fellBackToPlace}
              </span>{" "}
              instead. Try a Category chip to narrow it down.
            </p>
          )}
          {nearby && status === "success" && places.length > 0 && (
            <div
              className="mb-3 flex flex-wrap items-center gap-1.5"
              role="group"
              aria-label="Filter nearby results by category"
            >
              <button
                onClick={() => {
                  setNearbyFilter(null);
                  setVisibleCount(PAGE_SIZE);
                }}
                aria-pressed={nearbyFilter === null}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  nearbyFilter === null
                    ? "bg-primary text-primary-foreground"
                    : "surface-glass text-muted-foreground hover:text-foreground"
                }`}
              >
                All ({places.length})
              </button>
              {nearbyCategories.map((c) => {
                const n = places.filter(
                  (p) => matchPlaceCategory(p.category)?.key === c.key,
                ).length;
                return (
                  <button
                    key={c.key}
                    onClick={() => setNearbyFilter(c.key)}
                    aria-pressed={nearbyFilter === c.key}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      nearbyFilter === c.key
                        ? "bg-primary text-primary-foreground"
                        : "surface-glass text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {c.label} ({n})
                  </button>
                );
              })}
            </div>
          )}
          {status === "loading" && <SkeletonGrid />}
          {status === "empty" && (
            <EmptyState
              query={
                nearby && category ? `${category.toLowerCase()} near you` : query
              }
              onExample={(q) => void runSearch(q)}
            />
          )}
          {status === "error" && (
            <ErrorState
              onRetry={() =>
                mode === "nearby" ? runNearby() : void runSearch(query)
              }
            />
          )}
          {status === "success" &&
            (filteredPlaces.length > 0 ? (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {visiblePlaces.map((p, i) => (
                    <PlaceCard
                      key={p.id}
                      place={p}
                      index={i}
                      state={highlightStateFor(p.id, hoveredId, selectedId)}
                      favorite={favorites.some((f) => f.id === p.id)}
                      onHoverStart={() => setHoveredId(p.id)}
                      onHoverEnd={() =>
                        setHoveredId((cur) => (cur === p.id ? null : cur))
                      }
                      onSelect={() => openDetail(p)}
                      onToggleFavorite={() => toggleFavorite(p)}
                    />
                  ))}
                </div>
                {visibleCount < filteredPlaces.length && (
                  <div className="mt-4 flex justify-center">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="rounded-full"
                      onClick={() =>
                        setVisibleCount((n) => n + PAGE_SIZE)
                      }
                    >
                      Show more ({filteredPlaces.length - visibleCount}{" "}
                      remaining)
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <RegionPlaceholder
                icon="search"
                title="Your results will appear here"
                hint='Start with something like "salon in Pune".'
              />
            ))}
        </>
      }
      map={
        // Mounted from the first search onward so pins update in place —
        // pan/zoom survive and the pane never remounts between queries.
        query ? (
          <MapPane
            places={filteredPlaces}
            hoveredId={hoveredId}
            selectedId={selectedId}
            onHover={handleMapHover}
            onSelect={(id) => {
              const place = places.find((p) => p.id === id);
              if (place) openDetail(place);
            }}
          />
        ) : (
          <RegionPlaceholder
            icon="map"
            title="Live map lands here"
            hint="Free OpenStreetMap tiles with a pin per place, hover-synced with the list."
          />
        )
      }
      mobileView={mobileView}
      onMobileViewChange={setMobileView}
      />
      <SearchPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onSubmit={(q) => void runSearch(q)}
      />
      {detailMatch && (
        <PlaceDetailSheet
          open
          osmType={detailMatch[1] as OsmType}
          osmId={Number(detailMatch[2])}
          fallbackPlace={places.find((p) => p.id === detailMatch[0]) ?? null}
          onClose={closeDetail}
        />
      )}
      </MotionConfig>
  );
}
