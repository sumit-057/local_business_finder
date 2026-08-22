import { describe, expect, it, vi } from "vitest";
import {
  addRecentSearch,
  getFavorites,
  getRecentSearches,
  isFavorite,
  setStorageForTests,
  toggleFavorite,
  useFavoritesSubscription,
} from "./local-store";
import type { Place } from "./place";

const place: Place = {
  id: "node/1",
  osmType: "node",
  osmId: 1,
  name: "Lakmé Salon",
  category: "shop/hairdresser",
  address: "Nagras Road, Pune",
  lat: 18.56,
  lon: 73.8,
};

function fakeStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
  } as Storage;
}

describe("favorites store", () => {
  it("is empty when storage is unavailable (SSR-safe)", () => {
    setStorageForTests(null);
    expect(getFavorites()).toEqual([]);
    expect(isFavorite("node/1")).toBe(false);
  });

  it("toggles a favorite and persists across reads", () => {
    const storage = fakeStorage();
    setStorageForTests(storage);

    toggleFavorite(place);
    expect(isFavorite("node/1")).toBe(true);
    expect(getFavorites()[0]?.name).toBe("Lakmé Salon");

    // A fresh read from the same storage simulates a reload.
    toggleFavorite(place);
    expect(isFavorite("node/1")).toBe(false);
  });

  it("notifies subscribers when favorites change", () => {
    setStorageForTests(fakeStorage());
    const listener = vi.fn();
    const unsubscribe = useFavoritesSubscription(listener);
    toggleFavorite(place);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    toggleFavorite(place);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("survives corrupt payloads", () => {
    const storage = fakeStorage();
    storage.setItem("lbf:favorites", "{not json");
    setStorageForTests(storage);
    expect(getFavorites()).toEqual([]);
    expect(isFavorite("node/1")).toBe(false);
  });
});

describe("recent searches store", () => {
  it("keeps the most recent query first and drops duplicates", () => {
    setStorageForTests(fakeStorage());
    addRecentSearch("salon in Pune");
    addRecentSearch("gyms in Austin");
    addRecentSearch("SALON IN PUNE");
    expect(getRecentSearches()).toEqual(["SALON IN PUNE", "gyms in Austin"]);
  });

  it("caps the list at eight entries", () => {
    setStorageForTests(fakeStorage());
    for (let i = 0; i < 12; i++) addRecentSearch(`query ${i}`);
    const recents = getRecentSearches();
    expect(recents.length).toBe(8);
    expect(recents[0]).toBe("query 11");
  });

  it("ignores blank queries", () => {
    setStorageForTests(fakeStorage());
    addRecentSearch("   ");
    expect(getRecentSearches()).toEqual([]);
  });
});
