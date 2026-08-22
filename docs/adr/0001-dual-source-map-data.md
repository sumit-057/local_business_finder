# Dual-source data architecture: Nominatim for text search, Overpass for radius and enrichment

We need three capabilities from free, key-less map data: named-place text search ("salon in Pune"), near-me radius search, and per-place detail enrichment. No single free API provides all three: Nominatim has excellent text search (verified live for Indian cities) but cannot do radius searches; Overpass does radius queries natively but is slow and sparse for text search. We split by capability — Nominatim serves Smart Query text search, Overpass serves Near Me radius searches and Enrichment of a selected Place. Both are proxied through server-side route handlers that set the required descriptive User-Agent and respect each API's rate limits.

## Consequences

- A normalization layer maps both providers' responses into one `Place` shape.
- Overpass data is volunteer-tagged and thin in some regions (verified: ~5 hairdressers within 2km of central Pune, most without phone/hours); all enriched sections must render conditionally.
- Both APIs are rate-limited; responses are cached at the platform level (Vercel edge `Cache-Control`/Data Cache), not only in process memory, because Vercel functions are ephemeral.
