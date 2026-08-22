# Spec: local_business_finder

## Problem Statement

People need to find local businesses - "salon in Pune", "gyms in Austin" - but free public map search is a bare-bones text dump: no scannable cards, no spatial sense of where places are, no way to keep or share what you found. A visitor wants an instant, trustworthy, beautiful answer to "what's near this place?"

## Solution

An app-first web directory on live OpenStreetMap data with a dark, premium visual identity. One smart search box parses natural queries ("salon in Pune"); results appear simultaneously as a scannable card grid and pins on a live interactive map, synchronized on hover. Selecting a Place opens a rich detail slide-over with best-effort contact details, hours, and directions. Near Me searches by detected location; favorites persist in the browser; every view is a shareable URL. Loading, empty, and error states are designed first-class.

## User Stories

1. As a visitor, I want to type one query like "salon in Pune", so that I never fill separate what/where fields.
2. As a visitor, I want my query parsed into a Category and a place automatically, so results match my intent even when phrased loosely.
3. As a visitor, I want queries that do not fit the pattern sent verbatim to search, so unusual questions still get answers.
4. As a visitor, I want results as responsive cards showing name, category, and address, so I can scan many options quickly.
5. As a visitor, I want a live map beside the list with a pin per Place, so I understand where things actually are.
6. As a visitor, I want hovering a card to highlight its pin (and vice versa), so I can connect list entries to locations without clicking.
7. As a visitor, I want to select a Place and see its details in a slide-over without losing map and list context, so exploration stays fluid.
8. As a visitor, I want each Place to have its own URL, so I can bookmark or share exactly what I found.
9. As a visitor, I want a detail view showing address, coordinates, and a static map preview, so I can orient myself before visiting.
10. As a visitor, I want Enrichment data (phone, website, opening hours) shown when OSM volunteers tagged it, and sections quietly absent when nobody has.
11. As a visitor, I want a one-click directions link for a Place, so I can navigate there from wherever I am.
12. As a visitor, I want category chips (salon, gym, cafe, pharmacy...) under the search box, so common searches are one tap away.
13. As a visitor, I want example-query pills on the empty state, so I instantly understand what I can ask.
14. As a keyboard user, I want a command palette on Cmd/Ctrl+K wrapping the same Smart Query search with recent searches and chips, so searching never requires the mouse.
15. As a returning visitor, I want my recent searches remembered locally, so repeated lookups are one click.
16. As a mobile visitor, I want a toggle between list and map views, so each gets my full small screen.
17. As a visitor, I want a "Near Me" action that searches my detected area, so I find options around me without naming a place.
18. As a privacy-conscious visitor, I want geolocation requested only when I choose Near Me, and a graceful fallback when I deny it, so I stay in control.
19. As a visitor, I want to favorite Places, so I can shortlist them across visits.
20. As a visitor, I want favorites stored only in my browser, so no account is ever required.
21. As a visitor arriving from a shared link like /search?q=salon+in+Pune, I want the exact results restored, so shares work.
22. As a first-time visitor, I want a populated default search already loaded, so my first impression is a living product, not a blank form.
23. As a visitor, I want shimmer skeleton cards while searching, so slowness feels designed rather than broken.
24. As a visitor whose search returns nothing, I want an illustrated empty state with suggested alternatives, so a dead end becomes a new attempt.
25. As a visitor, I want a clear error state with a retry action when upstream map data fails, so a hiccup never dead-ends me.
26. As an impatient visitor, I want popular queries served from edge cache, so repeat searches feel instant.
27. As a visitor, I want smooth transitions and micro-animations between states, so the product feels crafted.
28. As a visitor using assistive tech or keyboard only, I want focus states and semantic structure, so the product works for everyone.
29. As the site owner, I want all upstream API calls proxied server-side with proper User-Agent and rate limiting, so we respect Nominatim/Overpass policy and never get blocked.
30. As the site owner, I want both providers normalized into one Place shape behind route handlers, so swapping or adding a data source never touches the UI.

## Implementation Decisions

- Stack: Next.js App Router + TypeScript, Tailwind CSS + shadcn/ui, Framer Motion for transitions, react-leaflet on free OSM raster tiles. Deployed on Vercel.
- Dual-source data architecture per ADR-0001: Nominatim serves Smart Query text search; Overpass serves Near Me radius searches and Enrichment of a selected Place.
- Three route handlers form the app's entire data boundary: /api/search (Smart Query to Places), /api/nearby (coords + Category to Places), /api/place/[osmType]/[id] (Enrichment). The client never calls providers directly.
- Route handlers set a descriptive User-Agent, serialize requests to respect rate limits (~1 req/s), and cache responses at the platform level (Cache-Control s-maxage ~60s) plus an in-process LRU as bonus.
- A normalization layer maps both providers' responses into a single Place shape (name, Category, address parts, position, osmType/osmId).
- Smart Query parser: matches "<category> in <place>" patterns against the server-side Category table; otherwise passes text through verbatim.
- Category-to-OSM-tag mapping owned server-side in one table (e.g. salon maps to shop=hairdresser and shop=beauty).
- Search lifecycle modeled as an explicit state machine: idle, loading, success, empty, error - every UI state designed deliberately.
- Detail view is URL-addressable (/place/[osmType]/[id]): slide-over panel over the split view on desktop, full-screen sheet on mobile. Includes static map preview and directions link.
- Favorites and recent searches persisted in localStorage via a small store wrapper.
- Visual kit is isolated and easily replaceable: lucide-react icons, custom SVG logomark, Category-to-icon mapping, gradient-mesh plus noise background layers, hand-built SVG illustrations for hero/empty/error states. No stock photos.

## Testing Decisions

- Good tests assert external behavior only: response shapes, status codes, cache headers, error bodies - never implementation details.
- One seam: the three route handlers, tested directly with Vitest using stubbed upstream fetch and recorded fixtures from live Nominatim/Overpass responses.
- Covered behaviors: Smart Query parse-or-verbatim routing; normalization of both providers into Place; empty results yield clean empty payloads; upstream failures yield typed error bodies; Enrichment omits untagged fields rather than returning nulls; cache headers present.
- No UI component tests or snapshots: visual quality is human-judged in this project; the design system moves too fast to lock down.
- No prior art exists (greenfield); these are the first tests in the repo.

## Out of Scope

- Accounts, auth, profiles, or any server-persisted user data
- Reviews, ratings, photos, or business claiming/editing
- Real-time data (open-now status, crowds), booking or messaging businesses
- Providers beyond Nominatim/Overpass; offline/PWA support; i18n beyond English
- Admin panel or analytics

## Further Notes

- Nominatim verified live for Indian cities ("salon in Pune" returns 20 real salons with clean addresses); Overpass enrichment is thin in some regions by design of volunteer data - conditional rendering is mandatory, not optional.
- Overpass fallback endpoints (e.g. overpass.kumi.systems) should be configurable if the primary mirror is slow.
- The default preload query is "cafes in Pune" pending owner revision after testing.
