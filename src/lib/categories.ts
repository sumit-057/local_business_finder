/**
 * The Category table: user-facing business types mapped onto the
 * provider-specific tags each source understands. Owned server-side;
 * the UI reads it through this module's exported data only.
 */

export interface Category {
  key: string;
  label: string;
  /** Words a visitor might type that resolve to this Category. */
  aliases: string[];
  /** A ready-made example query for chips and empty states. */
  exampleQuery: string;
  /** OSM tag filters (key=value) Overpass uses for radius searches. */
  osmTags: string[];
}

export const CATEGORIES: Category[] = [
  {
    key: "salon",
    label: "Salon",
    aliases: ["salon", "salons", "hair salon", "hairdresser", "beauty salon"],
    exampleQuery: "salon in Pune",
    osmTags: ["shop=hairdresser", "shop=beauty"],
  },
  {
    key: "gym",
    label: "Gym",
    aliases: ["gym", "gyms", "fitness", "fitness center"],
    exampleQuery: "gyms in Austin",
    osmTags: ["leisure=fitness_centre", "amenity=gym"],
  },
  {
    key: "cafe",
    label: "Café",
    aliases: ["cafe", "cafes", "café", "coffee shop", "coffee"],
    exampleQuery: "cafés in Pune",
    osmTags: ["amenity=cafe"],
  },
  {
    key: "restaurant",
    label: "Restaurant",
    aliases: ["restaurant", "restaurants", "food", "dinner"],
    exampleQuery: "restaurants in Mumbai",
    osmTags: ["amenity=restaurant"],
  },
  {
    key: "pharmacy",
    label: "Pharmacy",
    aliases: ["pharmacy", "pharmacies", "chemist", "drugstore"],
    exampleQuery: "pharmacies in Delhi",
    osmTags: ["amenity=pharmacy"],
  },
  {
    key: "bakery",
    label: "Bakery",
    aliases: ["bakery", "bakeries"],
    exampleQuery: "bakeries in Paris",
    osmTags: ["shop=bakery"],
  },
  {
    key: "software",
    label: "Software",
    aliases: [
      "software company",
      "software companies",
      "it company",
      "it companies",
      "tech company",
      "tech companies",
      "software firm",
      "software firms",
    ],
    exampleQuery: "software companies in Indore",
    osmTags: ["office=it", "office=company"],
  },
  {
    key: "hotel",
    label: "Hotel",
    aliases: ["hotel", "hotels"],
    exampleQuery: "hotels in Jaipur",
    osmTags: ["tourism=hotel", "tourism=guest_house"],
  },
  {
    key: "hospital",
    label: "Hospital",
    aliases: ["hospital", "hospitals", "clinic", "clinics"],
    exampleQuery: "hospitals in Chennai",
    osmTags: ["amenity=hospital", "amenity=clinic"],
  },
  {
    key: "school",
    label: "School",
    aliases: ["school", "schools"],
    exampleQuery: "schools in Hyderabad",
    osmTags: ["amenity=school"],
  },
  {
    key: "bank",
    label: "Bank",
    aliases: ["bank", "banks", "atm", "atms"],
    exampleQuery: "banks in Kolkata",
    osmTags: ["amenity=bank", "amenity=atm"],
  },
];

export function findCategory(alias: string): Category | null {
  const needle = alias.trim().toLowerCase();
  return (
    CATEGORIES.find((c) =>
      c.aliases.some((a) => needle === a || needle === `${a}s`),
    ) ?? null
  );
}

/** Resolves a Category by its canonical key; null when unknown. */
export function findCategoryByKey(key: string): Category | null {
  const needle = key.trim().toLowerCase();
  return CATEGORIES.find((c) => c.key === needle) ?? null;
}

/**
 * Reverse lookup: which Category (if any) owns a normalized Place's
 * category tag path ("shop/hairdresser" → salon). Used to group and
 * filter radius results.
 */
export function matchPlaceCategory(
  placeCategory: string | null,
): Category | null {
  if (!placeCategory) return null;
  return (
    CATEGORIES.find((c) =>
      c.osmTags.some((tag) => tag.replace("=", "/") === placeCategory),
    ) ?? null
  );
}

/** The query preloaded on first visit so the product lands alive. */
export const DEFAULT_QUERY = "cafes in Pune";
