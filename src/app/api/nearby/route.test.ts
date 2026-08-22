import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

// Recorded-style Overpass response: a tagged node and an unnamed way.
const fixture = {
  version: 0.6,
  elements: [
    {
      type: "node",
      id: 5013924587,
      lat: 18.5620603,
      lon: 73.8055756,
      tags: { name: "Lakmé Salon", shop: "hairdresser", phone: "+91 20 2729 0000" },
    },
    {
      type: "way",
      id: 77123456,
      center: { lat: 18.52043, lon: 73.85672 },
      tags: { shop: "beauty" },
    },
  ],
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function get(params = "lat=18.5204&lon=73.8567&category=salon") {
  return GET(new Request(`http://localhost/api/nearby?${params}`));
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(fixture)));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GET /api/nearby", () => {
  it("builds an Overpass around() query from the Category's OSM tags", async () => {
    await get();
    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(url).toContain("overpass");
    const query = decodeURIComponent(String(init.body));
    expect(query).toMatch(/\(around:2000,18\.520400,73\.856700\)/);
    expect(query).toContain("shop=hairdresser");
    expect(query).toContain("shop=beauty");
    expect(init.headers).toMatchObject({
      "User-Agent": expect.stringContaining("local_business_finder"),
    });
  });

  it("returns normalized Places for the requested Category", async () => {
    const res = await get();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.category).toBe("Salon");
    expect(body.origin).toEqual({ lat: 18.5204, lon: 73.8567 });
    expect(body.places[0]).toMatchObject({
      id: "node/5013924587",
      osmType: "node",
      name: "Lakmé Salon",
      category: "shop/hairdresser",
      lat: 18.5620603,
      lon: 73.8055756,
    });
    // The unnamed way still normalizes without nulls.
    const way = body.places.find((p: { id: string }) => p.id === "way/77123456");
    expect(way.name).toBeTruthy();
    expect(way.lat).toBe(18.52043);
  });

  it("rejects out-of-range coordinates without calling upstream", async () => {
    const res = await get("lat=99&lon=73.8567&category=salon");
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("invalid_request");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects malformed numbers without calling upstream", async () => {
    const res = await get("lat=abc&lon=73&category=cafe");
    expect(res.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects categories outside the table", async () => {
    const res = await get("lat=18.5&lon=73.8&category=unicorn");
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("invalid_request");
  });

  it("clamps radius to the supported band", async () => {
    await get("lat=18.5&lon=73.8&category=cafe&radius=999999");
    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(decodeURIComponent(String(init.body))).toMatch(
      /\(around:10000,18\.500000,73\.800000\)/,
    );
  });

  it("returns a clean empty payload when nothing is nearby", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ version: 0.6, elements: [] })),
    );
    const res = await get("lat=18.5&lon=73.8&category=gym");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.places).toEqual([]);
    expect(body.category).toBe("Gym");
  });

  it("returns a typed error body when Overpass fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ error: "boom" }, 502)),
    );
    // Unique coordinates so earlier tests' cache entries don't interfere.
    const res = await get("lat=-31.95&lon=115.86&category=gym");
    expect(res.status).toBe(502);
    expect((await res.json()).error.code).toBe("upstream_error");
  });

  it("unions every Category's tags for category=all", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ version: 0.6, elements: [] })),
    );
    const res = await get("lat=18.5&lon=73.8&category=all");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.category).toBe("Places");
    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    const query = decodeURIComponent(String(init.body));
    expect(query).toContain("shop=hairdresser");
    expect(query).toContain("office=it");
    expect(query).toContain("amenity=hospital");
  });

  it("sets platform cache headers on success", async () => {
    const res = await get("lat=1.1&lon=2.2&category=bakery");
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=60");
  });
});
