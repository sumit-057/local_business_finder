import { describe, expect, it } from "vitest";
import { boundsForPlaces } from "./map-bounds";
import type { Place } from "./place";

function place(id: string, lat: number, lon: number): Place {
  return {
    id,
    osmType: "node",
    osmId: Number(id),
    name: `Place ${id}`,
    category: null,
    address: "somewhere",
    lat,
    lon,
  };
}

describe("boundsForPlaces", () => {
  it("returns null for no places", () => {
    expect(boundsForPlaces([])).toBeNull();
  });

  it("returns a degenerate box for a single place", () => {
    expect(boundsForPlaces([place("1", 18.52, 73.85)])).toEqual([
      [18.52, 73.85],
      [18.52, 73.85],
    ]);
  });

  it("wraps all places in a min/max box regardless of input order", () => {
    const bounds = boundsForPlaces([
      place("1", 18.52, 73.85),
      place("2", 19.07, 72.87),
      place("3", 18.9, 74.01),
    ]);
    expect(bounds).toEqual([
      [18.52, 72.87],
      [19.07, 74.01],
    ]);
  });
});
