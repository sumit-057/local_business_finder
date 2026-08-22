Implemented in commit a3edc08, pushed to main.

- /api/search route handler: descriptive User-Agent, serialized requests (~1.1s gate), in-process LRU with 60s TTL, platform cache headers (s-maxage=60, stale-while-revalidate=300)
- Smart Query parser: "<category> in <place>" matched against the server-side Category table, verbatim fall-through; text always forwarded unchanged per Nominatim behavior verified live
- Normalization layer: both named and unnamed places map into one Place shape, never nulls
- Client workspace: search box, six category chips running prefilled queries, parsed-Category badge on results
- All four states designed: shimmer skeletons, illustrated empty state with example pills, error state with retry, success card grid with motion entrance
- Shareable /search?q= URLs (history.replaceState sync); first visit preloads "cafes in Pune"
- 12 seam tests passing (parse routing, verbatim fall-through, normalization incl. unnamed places, empty/error payloads, cache headers)

Verified live against Nominatim: real Pune salons returned through the normalized shape.

Deferred by design: SSR restore of cold /search loads (client fetch shows skeletons briefly); Overpass normalization arrives with its provider ticket per ADR-0001.
