import { normalizeNominatimPlace } from "@/lib/place";
import { parseSmartQuery } from "@/lib/smart-query";
import { CACHE_CONTROL, PROVIDER_UA } from "@/server/upstream";
import { LruCache } from "@/server/lru";
import { acquireProviderSlot } from "@/server/rate-gate";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const cache = new LruCache<{ status: number; body: string }>(128);

interface SearchPayload {
  query: string;
  category: string | null;
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

  const hits = (await upstream.json()) as Parameters<typeof normalizeNominatimPlace>[0][];
  const body: SearchPayload = {
    query: q,
    category: parsed.category?.label ?? null,
    places: hits.map(normalizeNominatimPlace),
  };
  cache.set(key, { status: 200, body: JSON.stringify(body) });
  return payload(body);
}
