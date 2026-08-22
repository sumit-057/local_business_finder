import { findCategory, type Category } from "./categories";

export interface ParsedSmartQuery {
  /** The matched Category, or null when the query falls through verbatim. */
  category: Category | null;
  /** The place phrase when the pattern matched, else null. */
  placePhrase: string | null;
  /** What actually goes to search: always the original text, verbatim. */
  searchText: string;
}

/**
 * Parses one search string into an optional Category plus a place phrase.
 * Nominatim already ranks "<category> in <place>" well (verified live), so
 * the text is always forwarded unchanged; parsing exists to label results,
 * drive chips, and route future provider-specific behavior per ADR-0001.
 */
export function parseSmartQuery(input: string): ParsedSmartQuery {
  const text = input.trim();
  const match = /^(.+?)\s+in\s+(.+)$/i.exec(text);
  if (!match) return { category: null, placePhrase: null, searchText: text };

  const category = findCategory(match[1]);
  if (!category) return { category: null, placePhrase: null, searchText: text };

  return { category, placePhrase: match[2].trim(), searchText: text };
}

/**
 * Extracts the place phrase from any "<subject> in <place>" query,
 * regardless of whether the subject matches a Category. Used for the
 * place-only fallback retry when a verbatim search comes back empty.
 */
export function extractPlacePhrase(input: string): string | null {
  const match = /^(.+?)\s+in\s+(.+)$/i.exec(input.trim());
  return match ? match[2].trim() : null;
}
