# local_business_finder

A searchable directory of local businesses built on live public OpenStreetMap data, judged on design and taste.

## Language

**Place**:
A business found in map data, normalized across sources into name, category, address, and position.
_Avoid_: business, POI, listing

**Category**:
A coarse business type (salon, gym, café…) presented to users, mapped behind the scenes onto provider-specific tags.
_Avoid_: type, amenity, filter

**Smart Query**:
A single search string parsed into an optional Category plus a place phrase ("salon in Pune"); sent verbatim to search when the pattern doesn't match.
_Avoid_: advanced search, filters

**Near Me**:
A radius search around the visitor's detected position, served by Overpass (Nominatim cannot do radius searches).
_Avoid_: geolocation search, location mode

**Enrichment**:
Best-effort extra details for a single Place (phone, opening hours, website) fetched from Overpass on selection; detail sections render only when the data exists.
_Avoid_: details API, full record

**Favorite**:
A Place bookmarked by the visitor, persisted in browser localStorage only; no accounts exist in this product.
_Avoid_: saved place, pin, collection
