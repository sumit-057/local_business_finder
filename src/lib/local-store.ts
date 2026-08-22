"use client";

import { useSyncExternalStore } from "react";
import type { Place } from "@/lib/place";

/**
 * Small localStorage store wrapper: favorites and recent searches live
 * only in the visitor's browser — no accounts exist in this product.
 * Storage is injectable so tests (and SSR) can run without a window.
 */

const FAVORITES_KEY = "lbf:favorites";
const RECENTS_KEY = "lbf:recent-searches";
const MAX_RECENTS = 8;

type Listener = () => void;
const listeners = new Set<Listener>();

let storageOverride: Storage | null | undefined;

function storage(): Storage | null {
  if (storageOverride !== undefined) return storageOverride;
  return typeof window === "undefined" ? null : window.localStorage;
}

/** Test/SSR seam: pin the store to a specific storage backend. */
export function setStorageForTests(s: Storage | null): void {
  storageOverride = s;
  favoritesCache = null;
  recentsCache = null;
}

function read<T>(key: string): T[] {
  try {
    const raw = storage()?.getItem(key);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function write(key: string, value: unknown[]): void {
  try {
    storage()?.setItem(key, JSON.stringify(value));
  } catch {
    // Quota/private-mode failures are non-fatal by design.
  }
}

function emit(): void {
  // Invalidate cached snapshots so the next read picks up the write;
  // between writes the references stay stable (required by
  // useSyncExternalStore).
  favoritesCache = null;
  recentsCache = null;
  for (const listener of listeners) listener();
}

/* ── Favorites ────────────────────────────────────────────────────────── */

let favoritesCache: Place[] | null = null;

export function getFavorites(): Place[] {
  favoritesCache ??= read<Place>(FAVORITES_KEY);
  return favoritesCache;
}

export function isFavorite(id: string): boolean {
  return getFavorites().some((p) => p.id === id);
}

export function toggleFavorite(place: Place): void {
  const current = getFavorites();
  const next = current.some((p) => p.id === place.id)
    ? current.filter((p) => p.id !== place.id)
    : [place, ...current];
  write(FAVORITES_KEY, next);
  emit();
}

export function removeFavorite(id: string): void {
  write(
    FAVORITES_KEY,
    getFavorites().filter((p) => p.id !== id),
  );
  emit();
}

/* ── Recent searches ──────────────────────────────────────────────────── */

let recentsCache: string[] | null = null;

export function getRecentSearches(): string[] {
  recentsCache ??= read<string>(RECENTS_KEY);
  return recentsCache;
}

export function addRecentSearch(query: string): void {
  const text = query.trim();
  if (!text) return;
  const needle = text.toLowerCase();
  const next = [text, ...getRecentSearches().filter((q) => q.toLowerCase() !== needle)];
  write(RECENTS_KEY, next.slice(0, MAX_RECENTS));
  emit();
}

/* ── React bindings ───────────────────────────────────────────────────── */

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const EMPTY: Place[] = [];
const NO_STRINGS: string[] = [];

/** Live list of favorites, kept in sync across every mounted consumer. */
export function useFavorites(): Place[] {
  return useSyncExternalStore(subscribe, getFavorites, () => EMPTY);
}

/** Live list of recent searches, most recent first. */
export function useRecentSearches(): string[] {
  return useSyncExternalStore(subscribe, getRecentSearches, () => NO_STRINGS);
}

/** Low-level subscription seam (used by tests). */
export function useFavoritesSubscription(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
