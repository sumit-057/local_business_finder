"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { PlaceCard } from "@/components/place/place-card";
import { SearchBox } from "@/components/search/search-box";
import { EmptyState, ErrorState, SkeletonGrid } from "@/components/search/states";
import { AppShell, RegionPlaceholder } from "@/components/layout/app-shell";
import { MapPane } from "@/components/map/map-pane";
import { Badge } from "@/components/ui/badge";
import { CATEGORIES } from "@/lib/categories";
import { highlightStateFor, placeCardElementId } from "@/lib/highlight";
import type { Place } from "@/lib/place";

type Status = "loading" | "success" | "empty" | "error";

interface SearchPayload {
  query: string;
  category: string | null;
  places?: Place[];
}

export function Workspace({ initialQuery }: { initialQuery: string }) {
  const [status, setStatus] = useState<Status>(initialQuery ? "loading" : "success");
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState<string | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "map">("list");
  const abortRef = useRef<AbortController | null>(null);

  const runSearch = useCallback(async (q: string) => {
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
      setStatus((body.places?.length ?? 0) > 0 ? "success" : "empty");
    } catch (e) {
      if ((e as Error).name !== "AbortError") setStatus("error");
    }
  }, []);

  useEffect(() => {
    if (!initialQuery) return;
    // Intentional: kick off the preloaded search once on mount; all state
    // updates flow through the async runSearch lifecycle.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void runSearch(initialQuery);
    return () => abortRef.current?.abort();
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

  const selectPlace = useCallback((id: string) => {
    setSelectedId((cur) => (cur === id ? null : id));
  }, []);

  const searching = status === "loading";

  return (
    <AppShell
      search={
        <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Find local businesses on{" "}
            <span className="bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              live map data
            </span>
          </h1>
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
            className="flex flex-wrap justify-center gap-2"
            aria-label="Category shortcuts"
          >
            {CATEGORIES.map((c) => (
              <button key={c.key} onClick={() => void runSearch(c.exampleQuery)}>
                <Badge
                  variant="secondary"
                  className="cursor-pointer rounded-full px-3 py-1 text-xs transition-colors hover:border-primary/50 hover:text-primary"
                >
                  {c.label}
                </Badge>
              </button>
            ))}
          </motion.div>
        </div>
      }
      results={
        <>
          {query && (
            <p className="mb-3 flex items-center gap-2 px-1 text-xs text-muted-foreground" aria-live="polite">
              <span>
                {status === "loading"
                  ? `Searching "${query}"…`
                  : `${places.length} place${places.length === 1 ? "" : "s"} for "${query}"`}
              </span>
              {category && status === "success" && (
                <Badge className="rounded-full bg-accent px-2 py-0 text-[11px] text-primary">
                  {category}
                </Badge>
              )}
            </p>
          )}
          {status === "loading" && <SkeletonGrid />}
          {status === "empty" && (
            <EmptyState query={query} onExample={(q) => void runSearch(q)} />
          )}
          {status === "error" && <ErrorState onRetry={() => void runSearch(query)} />}
          {status === "success" &&
            (places.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {places.map((p, i) => (
                  <PlaceCard
                    key={p.id}
                    place={p}
                    index={i}
                    state={highlightStateFor(p.id, hoveredId, selectedId)}
                    onHoverStart={() => setHoveredId(p.id)}
                    onHoverEnd={() =>
                      setHoveredId((cur) => (cur === p.id ? null : cur))
                    }
                    onSelect={() => selectPlace(p.id)}
                  />
                ))}
              </div>
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
            places={places}
            hoveredId={hoveredId}
            selectedId={selectedId}
            onHover={handleMapHover}
            onSelect={selectPlace}
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
  );
}
