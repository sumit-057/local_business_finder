import { CATEGORIES, findCategoryByKey } from "@/lib/categories";
import { normalizeOverpassPlace, type OverpassElement } from "@/lib/place";
import { CACHE_CONTROL, PROVIDER_UA } from "@/server/upstream";
import { LruCache } from "@/server/lru";
import { acquireProviderSlot } from "@/server/rate-gate";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const DEFAULT_RADIUS_M = 2000;
const MIN_RADIUS_M = 500;
const MAX_RADIUS_M = 10000;
const cache = new LruCache<{ status: number; body: string }>(128);

interface NearbyPayload {
  category: string;
  radius: number;
  origin: { lat: number; lon: number };
  places: unknown[];
}

interface ErrorPayload {
  error: { code: string; message: string };
  origin: null;
  places: [];
}

function payload(body: NearbyPayload | ErrorPayload, status = 200): Response {
  return Response.json(body, {
    status,
    headers:
      status === 200 ? { "Cache-Control": CACHE_CONTROL } : { "Cache-Control": "no-store" },
  });
}

function invalid(message: string): Response {
  return payload(
    { error: { code: "invalid_request", message }, origin: null, places: [] },
    400,
  );
}

export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const lat = Number(params.get("lat"));
  const lon = Number(params.get("lon"));
  const categoryParam = params.get("category") ?? "";
  const radius = Math.min(
    MAX_RADIUS_M,
    Math.max(MIN_RADIUS_M, Number(params.get("radius")) || DEFAULT_RADIUS_M),
  );

  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    return invalid("lat must be a number between -90 and 90.");
  }
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
    return invalid("lon must be a number between -180 and 180.");
  }

  // "all" unions every Category's tags in one upstream round-trip; the
  // client then filters locally per Category.
  const isAll = !categoryParam || categoryParam === "all";
  const category = findCategoryByKey(categoryParam);
  if (!isAll && !category) {
    return invalid("category must be a known Category key or 'all'.");
  }
  const osmTags = isAll
    ? CATEGORIES.flatMap((c) => c.osmTags)
    : category!.osmTags;
  const label = isAll ? "Places" : category!.label;

  // Coordinates are rounded for the cache key so nearby visitors share
  // platform-cached responses.
  const scopeKey = isAll ? "all" : category!.key;
  const cacheKey = `nearby:${scopeKey}:${radius}:${lat.toFixed(3)}:${lon.toFixed(3)}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return new Response(cached.body, {
      status: cached.status,
      headers: { "Cache-Control": CACHE_CONTROL },
    });
  }

  // One union statement per OSM tag.
  const selectors = osmTags
    .map(
      (tag) =>
        `nwr[${tag}](around:${radius},${lat.toFixed(6)},${lon.toFixed(6)});`,
    )
    .join("");
  const query = `[out:json][timeout:10];(${selectors});out tags center ${isAll ? 60 : 20};`;
  await acquireProviderSlot();

  let upstream: Response;
  try {
    upstream = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: {
        "User-Agent": PROVIDER_UA,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ data: query }).toString(),
      signal: AbortSignal.timeout(12_000),
    });
  } catch {
    return payload(
      {
        error: {
          code: "upstream_unavailable",
          message: "Map data is unreachable right now.",
        },
        origin: null,
        places: [],
      },
      502,
    );
  }

  if (!upstream.ok) {
    return payload(
      {
        error: {
          code: "upstream_error",
          message: "The map data provider returned an error.",
        },
        origin: null,
        places: [],
      },
      502,
    );
  }

  const parsed = (await upstream.json()) as { elements?: OverpassElement[] };
  const body: NearbyPayload = {
    category: label,
    radius,
    origin: { lat, lon },
    places: (parsed.elements ?? []).map(normalizeOverpassPlace),
  };
  cache.set(cacheKey, { status: 200, body: JSON.stringify(body) });
  return payload(body);
}
