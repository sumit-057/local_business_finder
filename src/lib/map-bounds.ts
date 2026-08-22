import type { Place } from "./place";

/**
 * The smallest lat/lon box containing every Place, in Leaflet's
 * [[southWest], [northEast]] shape — or null when there is nothing to fit.
 */
export function boundsForPlaces(places: Place[]): [[number, number], [number, number]] | null {
  if (places.length === 0) return null;
  let minLat = places[0].lat;
  let maxLat = places[0].lat;
  let minLon = places[0].lon;
  let maxLon = places[0].lon;
  for (const p of places) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lon < minLon) minLon = p.lon;
    if (p.lon > maxLon) maxLon = p.lon;
  }
  return [
    [minLat, minLon],
    [maxLat, maxLon],
  ];
}
