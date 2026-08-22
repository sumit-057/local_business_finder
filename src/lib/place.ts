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
