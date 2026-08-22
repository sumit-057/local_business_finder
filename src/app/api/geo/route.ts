import { LruCache } from "@/server/lru";

/**
 * Coarse, permission-free location from the visitor's IP address.
 * Used only after an explicit Near Me action or as a landing-page
 * fallback when device geolocation is denied or unavailable.
 */

interface GeoLocation {
  lat: number;
  lon: number;
  city?: string;
}

const cache = new LruCache<GeoLocation | null>(256, 300_000);

function isPublicIpv4(ip: string): boolean {
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) return false;
  return !/^(0\.|10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.)/.test(
    ip,
  );
}

export async function GET(request: Request): Promise<Response> {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "";
  // Loopback/private addresses (local dev) can't be located; without a
  // usable client IP the resolver reports our egress point instead.
  const publicIp = isPublicIpv4(ip) ? ip : "";
  const key = publicIp || "egress";

  const cached = cache.get(key);
  if (cached) {
    return Response.json({ location: cached });
  }

  try {
    const upstream = await fetch(
      publicIp ? `https://ipwho.is/${publicIp}` : "https://ipwho.is/",
      {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(5_000),
      },
    );
    const data = (await upstream.json()) as {
      success?: boolean;
      latitude?: number;
      longitude?: number;
      city?: string;
    };
    const location: GeoLocation | null =
      data.success !== false &&
      typeof data.latitude === "number" &&
      typeof data.longitude === "number"
        ? { lat: data.latitude, lon: data.longitude, city: data.city }
        : null;
    cache.set(key, location);
    return Response.json({ location });
  } catch {
    return Response.json(
      { location: null },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}
