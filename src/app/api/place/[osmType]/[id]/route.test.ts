import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

// Recorded-style Overpass response for a fully tagged node.
const richNodeFixture = {
  version: 0.6,
  elements: [
    {
      type: "node",
      id: 5013924587,
      lat: 18.5620603,
      lon: 73.8055756,
      tags: {
        name: "Lakmé Salon",
        shop: "hairdresser",
        phone: "+91 20 2729 0000",
        website: "https://lakme.example.com",
        opening_hours: "Mo-Sa 10:00-20:00",
        email: "hello@lakme.example.com",
        wheelchair: "yes",
        image: "https://upload.wikimedia.org/salon-photo.jpg",
        "addr:housenumber": "12",
        "addr:street": "Nagras Road",
        "addr:city": "Pune",
      },
    },
  ],
};

// A way carries no lat/lon of its own — only a center.
const sparseWayFixture = {
  version: 0.6,
  elements: [
    {
      type: "way",
      id: 77123456,
      center: { lat: 18.52043, lon: 73.85672 },
      tags: { shop: "beauty", "contact:phone": "+91 98765 43210" },
    },
  ],
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function get(osmType = "node", id = "5013924587") {
  return GET(new Request(`http://localhost/api/place/${osmType}/${id}`), {
    params: Promise.resolve({ osmType, id }),
  });
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(richNodeFixture)));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GET /api/place/[osmType]/[id]", () => {
  it("queries Overpass for the requested element and returns the normalized Place", async () => {
    const res = await get();
    expect(res.status).toBe(200);
    const body = await res.json();
    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(url).toContain("overpass");
    expect(decodeURIComponent(String(init.body))).toContain("node(5013924587)");
    expect(init.headers).toMatchObject({
      "User-Agent": expect.stringContaining("local_business_finder"),
    });
    expect(body.place).toMatchObject({
      id: "node/5013924587",
      osmType: "node",
      osmId: 5013924587,
      name: "Lakmé Salon",
      category: "shop/hairdresser",
      lat: 18.5620603,
      lon: 73.8055756,
    });
  });

  it("returns enrichment fields only when they are tagged", async () => {
    const res = await get();
    const body = await res.json();
    expect(body.enrichment.phone).toBe("+91 20 2729 0000");
    expect(body.enrichment.website).toBe("https://lakme.example.com");
    expect(body.enrichment.openingHours).toBe("Mo-Sa 10:00-20:00");
    expect(body.enrichment.email).toBe("hello@lakme.example.com");
    expect(body.enrichment.wheelchair).toBe("yes");
  });

  it("prettifies multi-value cuisine tags", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          version: 0.6,
          elements: [
            {
              type: "node",
              id: 42,
              lat: 1,
              lon: 2,
              tags: { amenity: "restaurant", cuisine: "pizza;pasta;regional" },
            },
          ],
        }),
      ),
    );
    const body = await (await get("node", "42")).json();
    expect(body.enrichment.cuisine).toBe("pizza, pasta, regional");
  });

  it("omits untagged enrichment fields instead of returning nulls", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(sparseWayFixture)),
    );
    const body = await (await get("way", "77123456")).json();
    expect(body.enrichment.phone).toBe("+91 98765 43210");
    expect("website" in body.enrichment).toBe(false);
    expect("openingHours" in body.enrichment).toBe(false);
  });

  it("takes a way's position from its center", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(sparseWayFixture)),
    );
    const body = await (await get("way", "77123456")).json();
    expect(body.place.lat).toBe(18.52043);
    expect(body.place.lon).toBe(73.85672);
    expect(body.place.id).toBe("way/77123456");
  });

  it("derives a readable address from addr:* tags", async () => {
    const body = await (await get()).json();
    expect(body.place.address).toContain("Nagras Road");
    expect(body.place.address).toContain("Pune");
  });

  it("rejects an unknown osmType without calling upstream", async () => {
    const res = await get("castle", "123");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("invalid_request");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects a non-numeric id", async () => {
    const res = await get("node", "abc");
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("invalid_request");
  });

  it("returns a typed not-found error when the element does not exist", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ version: 0.6, elements: [] })),
    );
    const res = await get("node", "1");
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("not_found");
  });

  it("returns a typed upstream error when Overpass fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ error: "boom" }, 502)),
    );
    // Unique id so earlier tests' cache entries don't interfere.
    const res = await get("node", "424242");
    expect(res.status).toBe(502);
    expect((await res.json()).error.code).toBe("upstream_error");
  });

  it("prefers the volunteer-tagged image as photoUrl", async () => {
    // Unique id so we exercise the live path, not an earlier cache entry.
    const res = await get("node", "777001");
    const body = await res.json();
    expect(body.photoUrl).toBe("https://upload.wikimedia.org/salon-photo.jpg");
    // No Wikipedia lookup needed when an image is tagged.
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("falls back to a nearby Wikipedia photo when no image is tagged", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse(sparseWayFixture))
        .mockResolvedValueOnce(
          jsonResponse({
            query: {
              pages: [
                { title: "Unrelated", thumbnail: undefined },
                {
                  title: "Kalyani Nagar",
                  thumbnail: {
                    source: "https://upload.wikimedia.org/kalyani.jpg",
                  },
                },
              ],
            },
          }),
        ),
    );
    const body = await (await get("way", "888001")).json();
    expect(body.photoUrl).toBe("https://upload.wikimedia.org/kalyani.jpg");
  });

  it("sets platform cache headers on success", async () => {
    const res = await get();
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=60");
  });

  it("serves repeat lookups from the in-process cache without refetching", async () => {
    // Unique id so earlier tests' cache entries don't interfere.
    await get("node", "999001");
    await get("node", "999001");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
