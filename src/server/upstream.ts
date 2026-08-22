/**
 * Shared upstream-provider conventions (ADR-0001): every proxied call
 * carries a descriptive User-Agent, and successful responses are
 * cacheable at the platform level.
 */
export const PROVIDER_UA =
  "local_business_finder/0.1 (directory demo; contact: repo owner)";
export const CACHE_CONTROL =
  "public, max-age=0, s-maxage=60, stale-while-revalidate=300";
