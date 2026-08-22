import {
  extractEnrichment,
  normalizeOverpassPlace,
  type OverpassElement,
  type PlaceEnrichment,
} from "@/lib/place";
import { CACHE_CONTROL, PROVIDER_UA } from "@/server/upstream";
import { LruCache } from "@/server/lru";
import { acquireProviderSlot } from "@/server/rate-gate";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const WIKIPEDIA_URL = "https://en.wikipedia.org/w/api.php";
const cache = new LruCache<{ status: number; body: string }>(128);

/**
 * Free, key-less photo lookup: the closest Wikipedia article with a
 * thumbnail within ~300 m of the Place. Volunteer-tagged images always
 * win when present.
 */
async function findWikipediaPhoto(
  lat: number,
  lon: number,
): Promise<string | undefined> {
  try {
    const url =
      `${WIKIPEDIA_URL}?action=query&generator=geosearch` +
      `&ggscoord=${lat.toFixed(5)}%7C${lon.toFixed(5)}&ggsradius=300&ggslimit=8` +
      `&prop=pageimages&piprop=thumbnail&pithumbsize=800&format=json&formatversion=2`;
    const res = await fetch(url, {
      headers: { "User-Agent": PROVIDER_UA, Accept: "application/json" },
      signal: AbortSignal.timeout(4_000),
    });
    if (!res.ok) return undefined;
    const data = (await res.json()) as {
      query?: { pages?: Array<{ thumbnail?: { source?: string } }> };
    };
    return data.query?.pages?.find((p) => p.thumbnail?.source)?.thumbnail
      ?.source;
  } catch {
    return undefined;
  }
}

interface PlaceDetailPayload {
  place: unknown;
  enrichment: PlaceEnrichment;
  /** Real photo of/around the place — volunteer image first, then Wikipedia. */
  photoUrl?: string;
}

interface ErrorPayload {
  error: { code: string; message: string };
  place: null;
  enrichment: PlaceEnrichment;
}

function payload(body: PlaceDetailPayload | ErrorPayload, status = 200): Response {
  return Response.json(body, {
    status,
    headers:
      status === 200 ? { "Cache-Control": CACHE_CONTROL } : { "Cache-Control": "no-store" },
  });
}

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ osmType: string; id: string }> },
): Promise<Response> {
  const { osmType, id } = await ctx.params;
  if (osmType !== "node" && osmType !== "way" && osmType !== "relation") {
    return payload(
      {
        error: { code: "invalid_request", message: "osmType must be node, way, or relation." },
        place: null,
        enrichment: {},
      },
      400,
    );
  }
  const osmId = Number(id);
  if (!Number.isInteger(osmId) || osmId <= 0) {
    return payload(
      {
        error: { code: "invalid_request", message: "id must be a positive integer." },
        place: null,
        enrichment: {},
      },
      400,
    );
  }

  const cacheKey = `place:${osmType}/${osmId}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return new Response(cached.body, {
      status: cached.status,
      headers: { "Cache-Control": CACHE_CONTROL },
    });
  }

  // `out tags center` returns tags plus a centroid for ways/relations.
  const query = `[out:json][timeout:8];${osmType}(${osmId});out tags center;`;
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
        place: null,
        enrichment: {},
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
        place: null,
        enrichment: {},
      },
      502,
    );
  }

  const parsed = (await upstream.json()) as { elements?: OverpassElement[] };
  const element = parsed.elements?.[0];
  if (!element) {
    return payload(
      {
        error: {
          code: "not_found",
          message: "That place is not in the map data.",
        },
        place: null,
        enrichment: {},
      },
      404,
    );
  }

  const normalized = normalizeOverpassPlace(element);
  const enrichment = extractEnrichment(element.tags ?? {});
  const photoUrl =
    enrichment.imageUrl ??
    (Number.isFinite(normalized.lat) && Number.isFinite(normalized.lon)
      ? await findWikipediaPhoto(normalized.lat, normalized.lon)
      : undefined);

  const body: PlaceDetailPayload = {
    place: normalized,
    enrichment,
    ...(photoUrl ? { photoUrl } : {}),
  };
  cache.set(cacheKey, { status: 200, body: JSON.stringify(body) });
  return payload(body);
}
