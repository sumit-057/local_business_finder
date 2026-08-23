# Quick Study: Project Answers

**Q1. smart-query parsing**
The parser uses regex `/^(.+?)\s+in\s+(.+)$/i` to split a query into category and location. If the query has no "in" (e.g. "apple store"), both `category` and `placePhrase` become `null`, and the original text is forwarded verbatim as `searchText`. If the leading phrase doesn't match a known category (e.g. unrecognized city), `findCategory` returns `null`, triggering the same verbatim fallback. The location phrase after "in" is captured as `placePhrase` but is not validated against known cities—it's carried through for labeling, chips, and future provider routing per the ADR.

**Q2. LRU cache + rate-gate**
- **LRU cache** (`lru.ts`): Keys entries by string (typically `category:location`). Eviction policy is FIFO: when `map.size > capacity`, the oldest entry is deleted via `this.map.keys().next().value`. Each entry has a TTL (default 60_000ms / 1 minute) after which it expires.
- **Rate-gate** (`rate-gate.ts`): Serializes upstream provider calls per process instance with a minimum ~1.1s interval (`MIN_INTERVAL_MS = 1100`). It's best-effort per process only. On multi-instance/serverless hosts, each function gets its own independent gate; the primary cross-instance shield is the platform-level `Cache-Control: s-maxage=60` header set in `upstream.ts`, not the in-process gate.

**Q3. Design ownership**
- I designed ADR-0001 (dual-source map architecture: Nominatim for text search, Overpass for radius/enrichment), the rate-gate throttle, the LRU cache structure, and the concrete `smart-query` parsing logic (`findCategory` regex matching).
- The agent-skills framework, skill discovery, categories table population, search route wiring, and UI construction around parsed queries is the agents' heavy lifting. The `findCategory` function and parsing pattern were my implementation to make the domain model work, but the model itself (categories, provider split, caching strategy) was established by the agents.