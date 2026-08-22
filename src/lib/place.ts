/**
 * The Place shape: one normalized business record both providers
 * (Nominatim now, Overpass per ADR-0001) are mapped into.
 */

export type OsmType = "node" | "way" | "relation";

export interface Place {
  /** Stable identity: "<osmType>/<osmId>". */
  id: string;
  osmType: OsmType;
  osmId: number;
  name: string;
  category: string | null;
  address: string;
  lat: number;
  lon: number;
}

interface NominatimHit {
  osm_type?: string;
  osm_id?: number;
  lat?: string;
  lon?: string;
  name?: string;
  display_name?: string;
  type?: string;
  category?: string;
  addresstype?: string;
}

function asOsmType(value: string | undefined): OsmType {
  return value === "way" || value === "relation" ? value : "node";
}

/** Splits a Nominatim display_name into a short address (drop the tail). */
function shortAddress(displayName: string): string {
  const parts = displayName.split(", ");
  if (parts.length <= 1) return displayName;
  const keep = parts.length > 6 ? parts.length - 4 : parts.length - 1;
  return parts.slice(0, Math.max(1, keep)).join(", ");
}

export function normalizeNominatimPlace(hit: NominatimHit): Place {
  const osmType = asOsmType(hit.osm_type);
  const osmId = Number(hit.osm_id ?? 0);
  const displayName = hit.display_name ?? "";
  return {
    id: `${osmType}/${osmId}`,
    osmType,
    osmId,
    // Unnamed places still deserve a usable card title, never nulls.
    name: hit.name?.trim() || hit.type || "Unnamed place",
    category: hit.category && hit.type ? `${hit.category}/${hit.type}` : null,
    address: shortAddress(displayName) || displayName,
    lat: Number(hit.lat),
    lon: Number(hit.lon),
  };
}

/** One element from an Overpass `out tags center` response. */
export interface OverpassElement {
  type?: string;
  id?: number;
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  tags?: Record<string, string>;
}

const CATEGORY_KEYS = ["shop", "amenity", "craft", "office", "tourism", "leisure"] as const;

const ADDRESS_KEYS = [
  "addr:housenumber",
  "addr:street",
  "addr:suburb",
  "addr:city",
  "addr:postcode",
] as const;

export function normalizeOverpassPlace(element: OverpassElement): Place {
  const osmType = asOsmType(element.type);
  const osmId = Number(element.id ?? 0);
  const tags = element.tags ?? {};
  const categoryKey = CATEGORY_KEYS.find((key) => tags[key]);
  const addressParts = ADDRESS_KEYS.map((key) => tags[key]).filter(Boolean);
  return {
    id: `${osmType}/${osmId}`,
    osmType,
    osmId,
    name:
      tags.name?.trim() ||
      tags.operator?.trim() ||
      (categoryKey && tags[categoryKey]) ||
      "Unnamed place",
    category: categoryKey ? `${categoryKey}/${tags[categoryKey]}` : null,
    address: addressParts.join(", "),
    // Ways and relations expose their centroid under `center`.
    lat: Number(element.lat ?? element.center?.lat),
    lon: Number(element.lon ?? element.center?.lon),
  };
}

/**
 * Enrichment for one Place: only fields OSM volunteers actually tagged.
 * Absent keys mean "not tagged" — never nulls or empty strings.
 */
export interface PlaceEnrichment {
  phone?: string;
  website?: string;
  openingHours?: string;
}

export function extractEnrichment(tags: Record<string, string>): PlaceEnrichment {
  const enrichment: PlaceEnrichment = {};
  const phone = tags.phone?.trim() || tags["contact:phone"]?.trim();
  if (phone) enrichment.phone = phone;
  const website = tags.website?.trim() || tags["contact:website"]?.trim();
  if (website) enrichment.website = website;
  const openingHours = tags.opening_hours?.trim();
  if (openingHours) enrichment.openingHours = openingHours;
  return enrichment;
}
