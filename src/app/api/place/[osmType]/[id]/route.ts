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
const cache = new LruCache<{ status: number; body: string }>(128);

interface PlaceDetailPayload {
  place: unknown;
  enrichment: PlaceEnrichment;
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

  const body: PlaceDetailPayload = {
    place: normalizeOverpassPlace(element),
    enrichment: extractEnrichment(element.tags ?? {}),
  };
  cache.set(cacheKey, { status: 200, body: JSON.stringify(body) });
  return payload(body);
}
