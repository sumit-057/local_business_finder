import { normalizeNominatimPlace } from "@/lib/place";
import { extractPlacePhrase, parseSmartQuery } from "@/lib/smart-query";
import { CACHE_CONTROL, PROVIDER_UA } from "@/server/upstream";
import { LruCache } from "@/server/lru";
import { acquireProviderSlot } from "@/server/rate-gate";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
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
  await acquireProviderSlot();

  let upstream: Response;
  try {
    upstream = await fetch(
      `${NOMINATIM_URL}?q=${encodeURIComponent(q)}&format=jsonv2&limit=20&addressdetails=0`,
      {
        headers: { "User-Agent": PROVIDER_UA, Accept: "application/json" },
        signal: AbortSignal.timeout(8_000),
      },
    );
  } catch {
    return Response.json(
      { error: { code: "upstream_unavailable", message: "Map data is unreachable right now." }, query: q, places: [] },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!upstream.ok) {
    return Response.json(
      { error: { code: "upstream_error", message: "The map data provider returned an error." }, query: q, places: [] },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }

  let hits = (await upstream.json()) as Parameters<typeof normalizeNominatimPlace>[0][];

  // Nominatim is a geocoder, not a keyword engine: free-form subjects
  // ("software companies in Indore") often come back empty. Retry with
  // just the place so the visitor still sees that place alive.
  let fellBackToPlace: string | null = null;
  if (hits.length === 0) {
    const placePhrase = extractPlacePhrase(q);
    if (placePhrase && placePhrase.toLowerCase() !== q.toLowerCase()) {
      fellBackToPlace = placePhrase;
      await acquireProviderSlot();
      try {
        upstream = await fetch(
          `${NOMINATIM_URL}?q=${encodeURIComponent(placePhrase)}&format=jsonv2&limit=20&addressdetails=0`,
          {
            headers: { "User-Agent": PROVIDER_UA, Accept: "application/json" },
            signal: AbortSignal.timeout(8_000),
          },
        );
        if (upstream.ok) {
          hits = (await upstream.json()) as typeof hits;
          if (hits.length === 0) fellBackToPlace = null;
        } else {
          fellBackToPlace = null;
        }
      } catch {
        fellBackToPlace = null;
      }
    }
  }

  const body: SearchPayload = {
    query: q,
    // After a fallback the results are generic place hits, not Category
    // matches — reporting the original Category here would mislead.
    category: fellBackToPlace ? null : (parsed.category?.label ?? null),
    ...(fellBackToPlace ? { fellBackToPlace } : {}),
    places: hits.map(normalizeNominatimPlace),
  };
  cache.set(key, { status: 200, body: JSON.stringify(body) });
  return payload(body);
}
