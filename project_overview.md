Brief
Next.js + any AI tool · 48h

Build a searchable directory of local businesses on live public map data.

Build
A search box: type a place + category (e.g. "salon in Pune", "gyms in Austin").
Show results as a responsive list of cards (name, type, address). A map is a nice-to-have, not required.
A detail view for a selected place.
Handle empty / loading / error states — searches sometimes return nothing.
Public data (no key, no query language)
OpenStreetMap Nominatim search — a plain text query that returns JSON.

Try it: https://nominatim.openstreetmap.org/search?q=salon+in+Pune&format=jsonv2&limit=20 → an array of places with display_name, lat, lon, type. Send a descriptive User-Agent header and keep to ~1 request/second.

> Any source works — the one named above is just a reference. Use it, swap in another free public API, or build/generate your own data. We judge what you ship — design, exploration, and that it works on real, live data — not the provider.

We judge
Design & taste (highest weight): card layout, typography, responsiveness, and graceful empty/slow/failed states.
How cleanly you searched and shaped the results.
Deploy it live; submit your GitHub repo + live URL.
