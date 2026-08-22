import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function get(ip?: string) {
  const headers: Record<string, string> = {};
  if (ip) headers["x-forwarded-for"] = ip;
  return GET(new Request("http://localhost/api/geo", { headers }));
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      jsonResponse({
        success: true,
        latitude: 18.5204,
        longitude: 73.8567,
        city: "Pune",
      }),
    ),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GET /api/geo", () => {
  it("resolves a public client IP into coordinates and city", async () => {
    const res = await get("203.0.113.9");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.location).toEqual({ lat: 18.5204, lon: 73.8567, city: "Pune" });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("ipwho.is/203.0.113.9"),
      expect.anything(),
    );
  });

  it("never forwards private addresses to the resolver", async () => {
    await get("192.168.1.24");
    const [url] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string];
    expect(url).not.toContain("192.168");
    expect(url.endsWith("ipwho.is/")).toBe(true);
  });

  it("returns null location when the resolver fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network");
      }),
    );
    // Unique IP so earlier tests' cache entries don't interfere.
    const body = await (await get("198.51.100.7")).json();
    expect(body.location).toBeNull();
  });

  it("returns null location when the resolver rejects the lookup", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({ success: false, message: "reserved range" }),
      ),
    );
    const body = await (await get("198.51.100.8")).json();
    expect(body.location).toBeNull();
  });
});
