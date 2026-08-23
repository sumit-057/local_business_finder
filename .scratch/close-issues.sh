#!/usr/bin/env bash
set -e
R="sumit-057/local_business_finder"

gh issue close 4 --repo "$R" -c "Shipped in 8ed9c00. react-leaflet 5 on free OSM tiles, one pin per Place, hover sync both directions (card and pin), click-to-select consistent across list and map, desktop split view, mobile List/Map toggle with ResizeObserver-correct tile rendering."

gh issue close 5 --repo "$R" -c "Shipped in 4dec053 (+4c96b4a). Detail slide-over at /place/[osmType]/[id] with shareable URLs and back-navigation context preservation; Overpass enrichment handler returns phone, email, website, hours, cuisine, wheelchair, brand, wifi, seating, takeaway, delivery, payments — conditional rendering only when tagged; mini-map preview + directions link; full handler-seam test coverage."

gh issue close 6 --repo "$R" -c "Shipped in 5efa814 and 801f91b. /api/nearby runs an Overpass union of all Category tags around the visitor with local category filter chips; device GPS -> coarse IP-location fallback (/api/geo) -> designed denial state; landing page is now location-first with Pune as last resort."

gh issue close 7 --repo "$R" -c "Shipped in f602bc4. localStorage-backed favorites store (heart toggles on cards and detail sheet, browsable favorites shelf) and recent searches surfaced under the search box — TDD store wrapper, SSR-safe."

gh issue close 8 --repo "$R" -c "Shipped in 28595d5. Cmd/Ctrl+K palette wrapping the same Smart Query flow: free-text submit, recent searches, and Category chips selectable inline; global hotkey; built on cmdk."

gh issue close 9 --repo "$R" -c "Shipped across b6811bb, 440cf06 and follow-ups. Framer Motion micro-interactions (entrance/hover/lift, reduced-motion respected); focus-ring + semantic-structure pass (main landmark, aria labels); illustration kit isolated in brand/illustrations.tsx in one line style plus animated hero and interactive dot-field background (React Bits pattern); smoke script (.scratch/smoke.sh) passes against a production build — final run against the deployed Vercel URL remains an owner step once deployment lands."

gh issue close 1 --repo "$R" -c "Spec fully implemented — all child tickets #2–#9 are done and merged to main (see their closure notes). Remaining owner step outside this tracker: deploy to Vercel and re-run .scratch/smoke.sh against the live URL."
