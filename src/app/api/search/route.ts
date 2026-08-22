import {
  normalizeNominatimPlace,
  normalizeOverpassPlace,
  type OverpassElement,
} from "@/lib/place";
import { extractPlacePhrase, parseSmartQuery } from "@/lib/smart-query";
import { CACHE_CONTROL, PROVIDER_UA } from "@/server/upstream";
import { LruCache } from "@/server/lru";
import { acquireProviderSlot } from "@/server/rate-gate";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const MAX_CATEGORY_RESULTS = 150;
const cache = new LruCache<{ status: number; body: string }>(128);

interface SearchPayload {
  query: string;
  category: string | null;
  /** Set when zero hits triggered a retry with just the place phrase. */
  fellBackToPlace?: string;
  places: unknown[];
}

function payload(body: SearchPayload, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": CACHE_CONTROL },
  });
}

function errorBody(
  code: string,
  message: string,
  query: string,
): Response {
  return Response.json(
    {
      error: { code, message },
      query,
      places: [],
    },
    { status: 502, headers: { "Cache-Control": "no-store" } },
  );
}

/** Straight text search against the geocoder (best-effort POI matches). */
async function textSearch(text: string): Promise<
  Parameters<typeof normalizeNominatimPlace>[0][]
> {
  await acquireProviderSlot();
  const upstream = await fetch(
    `${NOMINATIM_URL}?q=${encodeURIComponent(text)}&format=jsonv2&limit=20&addressdetails=0`,
    {
      headers: { "User-Agent": PROVIDER_UA, Accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
    },
  );
  if (!upstream.ok) throw new Error("upstream_error");
  return (await upstream.json()) as Parameters<
    typeof normalizeNominatimPlace
  >[0][];
}

interface PlaceCenter {
  lat: number;
  lon: number;
  /** [south, west, north, east] — Overpass bbox order. */
  bbox: [number, number, number, number];
}

/** Geocodes just the place phrase ("Pune") into a center + bounding box. */
async function geocodePlace(place: string): Promise<PlaceCenter | null> {
  await acquireProviderSlot();
  const upstream = await fetch(
    `${NOMINATIM_URL}?q=${encodeURIComponent(place)}&format=jsonv2&limit=1&addressdetails=0`,
    {
      headers: { "User-Agent": PROVIDER_UA, Accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
    },
  );
  if (!upstream.ok) return null;
  const hits = (await upstream.json()) as Array<{
    lat?: string;
    lon?: string;
    boundingbox?: string[];
  }>;
  const hit = hits[0];
  if (!hit?.lat || !hit.lon || !hit.boundingbox || hit.boundingbox.length < 4) {
    return null;
  }
  // Nominatim order: south, north, west, east → Overpass: s, w, n, e.
  const bbox = [
    Number(hit.boundingbox[0]),
    Number(hit.boundingbox[2]),
    Number(hit.boundingbox[1]),
    Number(hit.boundingbox[3]),
  ] as [number, number, number, number];
  return { lat: Number(hit.lat), lon: Number(hit.lon), bbox };
}

/** Enumerates every tagged business of a Category inside a bounding box. */
async function overpassCategorySearch(
  osmTags: string[],
  bbox: [number, number, number, number],
): Promise<OverpassElement[]> {
  await acquireProviderSlot();
  const selectors = osmTags.map((tag) => `nwr[${tag}](${bbox.join(",")});`);
  const query = `[out:json][timeout:25];(${selectors});out tags center ${MAX_CATEGORY_RESULTS};`;
  const upstream = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: {
      "User-Agent": PROVIDER_UA,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ data: query }).toString(),
    signal: AbortSignal.timeout(20_000),
  });
  if (!upstream.ok) throw new Error("upstream_error");
  const data = (await upstream.json()) as { elements?: OverpassElement[] };
  return data.elements ?? [];
}

function distanceSq(
  aLat: number,
  aLon: number,
  bLat: number,
  bLon: number,
): number {
  const dLat = aLat - bLat;
  const dLon = aLon - bLon;
  return dLat * dLat + dLon * dLon;
}

export async function GET(request: Request): Promise<Response> {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (!q) return payload({ query: "", category: null, places: [] });

  const key = q.toLowerCase();
  const cached = cache.get(key);
  if (cached) {
    return new Response(cached.body, {
      status: cached.status,
      headers: { "Cache-Control": CACHE_CONTROL },
    });
  }

  const parsed = parseSmartQuery(q);

  /* ── Category + place: the comprehensive Overpass pipeline ────────── */
  if (parsed.category && parsed.placePhrase) {
    const place = await geocodePlace(parsed.placePhrase);
    if (place) {
      try {
        const elements = await overpassCategorySearch(
          parsed.category.osmTags,
          place.bbox,
        );
        // Named businesses only — unnamed shapes are directory noise.
        const places = elements
          .filter((el) => el.tags?.name?.trim())
          .map(normalizeOverpassPlace)
          .sort(
            (a, b) =>
              distanceSq(a.lat, a.lon, place.lat, place.lon) -
              distanceSq(b.lat, b.lon, place.lat, place.lon),
          )
          .slice(0, MAX_CATEGORY_RESULTS);
        const body: SearchPayload = {
          query: q,
          category: parsed.category.label,
          places,
        };
        if (places.length > 0) {
          cache.set(key, { status: 200, body: JSON.stringify(body) });
          return payload(body);
        }
        // Nothing enumerated here yet — surface the place's own POI
        // landscape instead of an empty result.
        const placeHits = await textSearch(parsed.placePhrase);
        if (placeHits.length > 0) {
          const fallbackBody: SearchPayload = {
            query: q,
            category: null,
            fellBackToPlace: parsed.placePhrase,
            places: placeHits.map(normalizeNominatimPlace),
          };
          cache.set(key, {
            status: 200,
            body: JSON.stringify(fallbackBody),
          });
          return payload(fallbackBody);
        }
      } catch {
        // Overpass unavailable → degrade gracefully to plain text search.
      }
    }
    // Geocode failed → fall through to verbatim search below.
  }

  /* ── Verbatim text search (unmatched subjects, geocoder failures) ─── */
  let hits: Parameters<typeof normalizeNominatimPlace>[0][];
  try {
    hits = await textSearch(q);
  } catch (e) {
    const code = (e as Error).message === "upstream_error" ? "upstream_error" : "upstream_unavailable";
    return errorBody(code, "Map data is unreachable right now.", q);
  }

  // Geocoders are keyword-blind; retry with just the place so any
  // "<subject> in <place>" question still gets an alive answer.
  let fellBackToPlace: string | null = null;
  if (hits.length === 0) {
    const placePhrase = extractPlacePhrase(q);
    if (placePhrase && placePhrase.toLowerCase() !== q.toLowerCase()) {
      fellBackToPlace = placePhrase;
      try {
        hits = await textSearch(placePhrase);
      } catch {
        fellBackToPlace = null;
      }
      // A retry that also came back empty shouldn't advertise a fallback.
      if (hits.length === 0) fellBackToPlace = null;
    }
  }

  const body: SearchPayload = {
    query: q,
    category: fellBackToPlace ? null : (parsed.category?.label ?? null),
    ...(fellBackToPlace ? { fellBackToPlace } : {}),
    places: hits.map(normalizeNominatimPlace),
  };
  cache.set(key, { status: 200, body: JSON.stringify(body) });
  return payload(body);
}
