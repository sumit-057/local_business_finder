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
}

export const CATEGORIES: Category[] = [
  {
    key: "salon",
    label: "Salon",
    aliases: ["salon", "salons", "hair salon", "hairdresser", "beauty salon"],
    exampleQuery: "salon in Pune",
  },
  {
    key: "gym",
    label: "Gym",
    aliases: ["gym", "gyms", "fitness", "fitness center"],
    exampleQuery: "gyms in Austin",
  },
  {
    key: "cafe",
    label: "Café",
    aliases: ["cafe", "cafes", "café", "coffee shop", "coffee"],
    exampleQuery: "cafés in Pune",
  },
  {
    key: "restaurant",
    label: "Restaurant",
    aliases: ["restaurant", "restaurants", "food", "dinner"],
    exampleQuery: "restaurants in Mumbai",
  },
  {
    key: "pharmacy",
    label: "Pharmacy",
    aliases: ["pharmacy", "pharmacies", "chemist", "drugstore"],
    exampleQuery: "pharmacies in Delhi",
  },
  {
    key: "bakery",
    label: "Bakery",
    aliases: ["bakery", "bakeries"],
    exampleQuery: "bakeries in Paris",
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

/** The query preloaded on first visit so the product lands alive. */
export const DEFAULT_QUERY = "cafes in Pune";
