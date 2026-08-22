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

/** The query preloaded on first visit so the product lands alive. */
export const DEFAULT_QUERY = "cafes in Pune";
