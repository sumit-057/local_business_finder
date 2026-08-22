/**
 * The illustration kit: hand-built SVGs in one consistent line style —
 * thin strokes, dotted terrain, a violet accent. Each drawing is an
 * isolated named export so assets can be swapped without touching
 * the components that place them.
 */

interface IllustrationProps {
  className?: string;
}

const BASE_CLASS = "h-20 w-auto text-muted-foreground/70";

/** Shared dotted terrain line used by every drawing. */
const TERRAIN_PATH =
  "M8 62c10-14 18-14 26-6s16 8 24-2 18-10 26 0 16 8 28-4";

function TerrainPath() {
  return (
    <path
      d={TERRAIN_PATH}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeDasharray="1 5"
      strokeLinecap="round"
    />
  );
}

/** Dotted map with a magnifier — "nothing found". */
export function EmptyIllustration({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 120 80"
      fill="none"
      className={className ?? BASE_CLASS}
      aria-hidden
    >
      <TerrainPath />
      <circle cx="30" cy="30" r="16" stroke="var(--primary)" strokeWidth="2" />
      <path d="m42 42 12 12" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="30" cy="30" r="7" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 4" />
    </svg>
  );
}

/** Unplugged pin over dotted terrain — "the data is unreachable". */
export function ErrorIllustration({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 120 80"
      fill="none"
      className={className ?? BASE_CLASS}
      aria-hidden
    >
      <TerrainPath />
      <path d="M60 18v22" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 4" />
      <path
        d="M60 40c8 0 12 5 12 10s-4 9-12 9-12-4-12-9 4-10 12-10Z"
        stroke="var(--primary)"
        strokeWidth="2"
        transform="rotate(38 60 49)"
      />
      <path d="m78 20 8 8m0-8-8 8" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** A rising pin over layered horizon lines — the hero mark. */
export function HeroIllustration({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 160 56"
      fill="none"
      className={className ?? "h-14 w-auto"}
      aria-hidden
    >
      <path
        d="M4 44c14-12 26-12 38-5s24 7 36-2 28-9 40 0 22 7 34-3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="1 5"
        strokeLinecap="round"
      />
      <path
        d="M80 10c7 0 11 5 11 10s-4 8-11 8-11-3-11-8 4-10 11-10Z"
        stroke="var(--primary)"
        strokeWidth="2"
      />
      <circle cx="80" cy="19" r="3" stroke="currentColor" strokeWidth="1.5" strokeDasharray="1.5 3" />
      <path d="M80 30v8" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
