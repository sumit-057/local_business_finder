import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

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
  {
    place_id: 98211234,
    osm_type: "way",
    osm_id: 77123456,
    lat: "18.5204300",
    lon: "73.8567200",
    category: "shop",
    type: "beauty",
    name: "",
    display_name: "Shop 4, Lane 7, Kalyani Nagar, Pune, Maharashtra, 411006, India",
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
    vi.fn(async () => jsonResponse(fixture)),
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

  it("forwards the query upstream and returns normalized Places", async () => {
    const res = await get("salon in Pune");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.query).toBe("salon in Pune");
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("q=salon%20in%20Pune"),
      expect.objectContaining({ headers: expect.objectContaining({ "User-Agent": expect.stringContaining("local_business_finder") }) }),
    );
    expect(body.places[0]).toMatchObject({
      id: "node/5013924587",
      osmType: "node",
      osmId: 5013924587,
      name: "Lakmé Salon",
      lat: 18.5620603,
      lon: 73.8055756,
    });
    expect(typeof body.places[0].address).toBe("string");
  });

  it("normalizes an unnamed place without nulls", async () => {
    const res = await get("salon in Pune");
    const body = await res.json();
    const unnamed = body.places.find((p: { id: string }) => p.id === "way/77123456");
    expect(unnamed.name).toBeTruthy();
    expect(unnamed.category).toBeTruthy();
  });

  it("sets platform cache headers on success", async () => {
    const res = await get("salon in Pune");
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=60");
  });

  it("falls through unmatched patterns verbatim with no category", async () => {
    await get("weird free text query");
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("q=weird%20free%20text%20query"),
      expect.anything(),
    );
    const body = (await (await get("weird free text query")).json()) as { category: string | null };
    expect(body.category).toBeNull();
  });

  it("returns a clean empty payload when upstream has zero hits", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse([])));
    const res = await get("zzz nothing here");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.places).toEqual([]);
  });

  it("returns a typed error body when upstream fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ error: "boom" }, 500)));
    const res = await get("upstream failure probe");
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error.code).toBe("upstream_error");
    expect(body.places).toEqual([]);
  });

  it("returns a typed error body when upstream times out or errors", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network"); }));
    const res = await get("network failure probe");
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(["upstream_error", "upstream_unavailable"]).toContain(body.error.code);
  });

  it("retries with the place phrase alone when a verbatim query has zero hits", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse([]))
        .mockResolvedValueOnce(jsonResponse(fixture)),
    );
    const res = await get("software companies in Indore");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.fellBackToPlace).toBe("Indore");
    // First call used the full text; second call the place phrase only.
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("q=software%20companies%20in%20Indore"),
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
    const res = await get("software companies in Nowhereville");
    const body = await res.json();
    expect(body.places).toEqual([]);
    expect(body.fellBackToPlace).toBeUndefined();
  });
});
