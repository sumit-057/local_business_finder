import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

// Nominatim geocode hit for the place phrase.
const puneGeocode = [
  {
    place_id: 1,
    osm_type: "node",
    osm_id: 555,
    lat: "18.5204",
    lon: "73.8567",
    display_name: "Pune, Maharashtra, India",
    boundingbox: ["18.4", "18.7", "73.7", "74.0"],
  },
];

// Overpass union result: two salons + an unnamed shape (noise).
const overpassSalons = {
  version: 0.6,
  elements: [
    {
      type: "node",
      id: 5013924587,
      lat: 18.5620603,
      lon: 73.8055756,
      tags: { name: "Lakmé Salon", shop: "hairdresser" },
    },
    {
      type: "way",
      id: 77123456,
      center: { lat: 18.5304, lon: 73.8567 },
      tags: { name: "Green Trends", shop: "hairdresser" },
    },
    {
      type: "way",
      id: 888,
      center: { lat: 18.54, lon: 73.85 },
      tags: { shop: "hairdresser" }, // unnamed → filtered out
    },
  ],
};

// Nominatim text hits for verbatim queries.
const fixture = [
  {
    place_id: 128945610,
    osm_type: "node",
    osm_id: 5013924587,
    lat: "18.5620603",
    lon: "73.8055756",
    category: "shop",
    type: "hairdresser",
    name: "Lakmé Salon",
    display_name:
      "Lakmé Salon, Nagras Road, Aundh, Pune, Pune City Subdistrict, Pune, Maharashtra, 411007, India",
  },
];

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function get(q?: string) {
  const url = q === undefined ? "http://localhost/api/search" : `http://localhost/api/search?q=${encodeURIComponent(q)}`;
  return GET(new Request(url));
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("nominatim") && url.includes("q=Pune")) {
        return jsonResponse(puneGeocode);
      }
      return jsonResponse(fixture);
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GET /api/search", () => {
  it("returns a clean empty payload when q is missing", async () => {
    const res = await get();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ query: "", category: null, places: [] });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("runs geocode-then-tag-query pipeline for '<category> in <place>'", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse(puneGeocode))
        .mockResolvedValueOnce(jsonResponse(overpassSalons)),
    );
    const res = await get("salon in Pune");
    expect(res.status).toBe(200);
    const body = await res.json();

    // Step 1 geocodes the place phrase only.
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("q=Pune"),
      expect.objectContaining({
        headers: expect.objectContaining({
          "User-Agent": expect.stringContaining("local_business_finder"),
        }),
      }),
    );
    // Step 2 enumerates every tagged salon inside the city bbox.
    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[1] as [
      string,
      RequestInit,
    ];
    const query = decodeURIComponent(String(init.body));
    expect(query).toContain("(18.4,73.7,18.7,74)");
    expect(query).toContain("shop=hairdresser");
    expect(query).toContain("shop=beauty");

    expect(body.category).toBe("Salon");
    expect(body.places.length).toBe(2); // unnamed shape filtered out
    expect(body.places[0]).toMatchObject({ name: "Green Trends" }); // nearest first
    expect(body.places[1]).toMatchObject({ id: "node/5013924587" });
  });

  it("degrades to the place's own results when enumeration finds nothing", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse(puneGeocode)) // geocode
        .mockResolvedValueOnce( // overpass: zero tagged salons
          jsonResponse({ version: 0.6, elements: [] }),
        )
        .mockResolvedValueOnce(jsonResponse(fixture)), // place text search
    );
    const res = await get("salon in Kharadi");
    const body = await res.json();
    expect(body.places.length).toBeGreaterThan(0);
    expect(body.fellBackToPlace).toBe("Kharadi");
    expect(body.category).toBeNull(); // results aren't category matches
  });

  it("forwards unmatched subjects verbatim to the geocoder", async () => {
    const res = await get("weird free text query");
    expect(res.status).toBe(200);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("q=weird%20free%20text%20query"),
      expect.objectContaining({ headers: expect.anything() }),
    );
    const body = await res.json();
    expect(body.category).toBeNull();
    expect(typeof body.places[0].address).toBe("string");
  });

  it("normalizes an unnamed place without nulls on verbatim searches", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse([
          { ...fixture[0], name: "", osm_id: 77123456, osm_type: "way" },
        ]),
      ),
    );
    const body = await (await get("unnamed probe")).json();
    expect(body.places[0].name).toBeTruthy();
  });

  it("sets platform cache headers on success", async () => {
    const res = await get("cache header probe");
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=60");
  });

  it("serves repeat lookups from the in-process cache without refetching", async () => {
    await get("verbatim cache probe alpha");
    await get("verbatim cache probe alpha");
    // Second lookup is served entirely from the response cache.
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("returns a clean empty payload when upstream has zero hits", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse([])));
    const res = await get("zzz nothing here");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.places).toEqual([]);
  });

  it("retries with the place phrase alone when a verbatim query has zero hits", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse([]))
        .mockResolvedValueOnce(jsonResponse(fixture)),
    );
    const res = await get("unicorn breeders in Indore");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.fellBackToPlace).toBe("Indore");
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("q=unicorn%20breeders%20in%20Indore"),
      expect.anything(),
    );
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("q=Indore"),
      expect.anything(),
    );
    expect(body.places.length).toBeGreaterThan(0);
  });

  it("does not set fellBackToPlace when even the place phrase has no hits", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse([])));
    const body = await (await get("gizmo sellers in Utopia")).json();
    expect(body.places).toEqual([]);
    expect(body.fellBackToPlace).toBeUndefined();
  });

  it("returns a typed error body when upstream fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ error: "boom" }, 500)),
    );
    const res = await get("upstream failure probe");
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(["upstream_error", "upstream_unavailable"]).toContain(
      body.error.code,
    );
  });

  it("returns a typed error body when upstream times out or errors", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network"); }));
    const res = await get("network failure probe");
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(["upstream_error", "upstream_unavailable"]).toContain(body.error.code);
  });
});
