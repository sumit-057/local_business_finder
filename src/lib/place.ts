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
  email?: string;
  website?: string;
  openingHours?: string;
  /** What they serve, e.g. "pizza" or "italian". */
  cuisine?: string;
  /** Accessibility as tagged: "yes", "limited", or "no". */
  wheelchair?: string;
  /** Photo URL volunteers attached via image/wikimedia tags. */
  imageUrl?: string;
  brand?: string;
  /** Free wifi / internet availability as tagged. */
  internet?: string;
  hasOutdoorSeating?: boolean;
  offersTakeaway?: boolean;
  offersDelivery?: boolean;
  /** Accepted payment methods, e.g. ["cash", "visa"]. */
  payments?: string[];
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: "cash",
  coins: "coins",
  notes: "notes",
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  debit_cards: "debit cards",
  credit_cards: "credit cards",
  contactless: "contactless",
  upi: "UPI",
  gpay: "Google Pay",
};

function pretty(value: string): string {
  return value.trim().replace(/_/g, " ");
}

export function extractEnrichment(tags: Record<string, string>): PlaceEnrichment {
  const enrichment: PlaceEnrichment = {};
  const phone = tags.phone?.trim() || tags["contact:phone"]?.trim();
  if (phone) enrichment.phone = phone;
  const email = tags.email?.trim() || tags["contact:email"]?.trim();
  if (email) enrichment.email = email;
  const website = tags.website?.trim() || tags["contact:website"]?.trim();
  if (website) enrichment.website = website;
  const openingHours = tags.opening_hours?.trim();
  if (openingHours) enrichment.openingHours = openingHours;
  const cuisine = tags.cuisine?.trim();
  if (cuisine) {
    // Multi-value cuisines are semicolon-separated in OSM.
    enrichment.cuisine = cuisine
      .split(";")
      .map((c) => c.trim().replace(/_/g, " "))
      .join(", ");
  }
  const wheelchair = tags.wheelchair?.trim();
  if (wheelchair) enrichment.wheelchair = wheelchair;

  const image = [tags.image, tags.wikimedia].find((v) => v?.startsWith("http"));
  if (image) enrichment.imageUrl = image;
  const brand = tags.brand?.trim();
  if (brand) enrichment.brand = brand;
  const internet = tags.internet_access?.trim();
  if (internet && internet !== "no") enrichment.internet = pretty(internet);
  if (tags.outdoor_seating === "yes") enrichment.hasOutdoorSeating = true;
  if (tags.takeaway === "yes" || tags.takeaway === "only")
    enrichment.offersTakeaway = true;
  if (tags.delivery === "yes") enrichment.offersDelivery = true;
  const payments = Object.entries(tags)
    .filter(([k, v]) => k.startsWith("payment:") && v === "yes")
    .map(([k]) => PAYMENT_LABELS[k.slice("payment:".length)] ?? pretty(k.slice(8)));
  if (payments.length > 0) enrichment.payments = payments;
  return enrichment;
}
