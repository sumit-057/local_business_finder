import { cn } from "@/lib/utils";

/**
 * Custom SVG logomark: a map pin whose inner dot is a search lens.
 * Pure vector, current-color friendly, gradient accent isolated here so
 * the visual kit stays easily replaceable.
 */
export function Logomark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn("size-8", className)}
    >
      <defs>
        <linearGradient id="lbf-mark" x1="4" y1="2" x2="28" y2="30">
          <stop offset="0%" stopColor="var(--mark-from)" />
          <stop offset="100%" stopColor="var(--mark-to)" />
        </linearGradient>
      </defs>
      <path
        d="M16 29c-6.2-6.9-10-12.1-10-17A10 10 0 1 1 26 12c0 4.9-3.8 10.1-10 17Z"
        stroke="url(#lbf-mark)"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <circle cx="15" cy="11" r="4.2" stroke="url(#lbf-mark)" strokeWidth="2" />
      <path
        d="m18.2 14.2 2.6 2.6"
        stroke="url(#lbf-mark)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
