"use client";

import { MapPinOff, RefreshCcw } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-3" aria-busy="true" aria-label="Loading results">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="surface-glass flex items-start gap-3 rounded-2xl p-4">
          <Skeleton className="size-9 rounded-full" />
          <div className="w-full space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/4" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Consistent line-style SVG art: a magnifier over a dotted map, nothing found. */
export function EmptyIllustration() {
  return (
    <svg viewBox="0 0 120 80" fill="none" className="h-20 w-auto text-muted-foreground/70" aria-hidden>
      <path
        d="M8 62c10-14 18-14 26-6s16 8 24-2 18-10 26 0 16 8 28-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="1 5"
        strokeLinecap="round"
      />
      <circle cx="30" cy="30" r="16" stroke="var(--primary)" strokeWidth="2" />
      <path d="m42 42 12 12" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="30" cy="30" r="7" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 4" />
    </svg>
  );
}

export function EmptyState({
  query,
  onExample,
}: {
  query: string;
  onExample: (q: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="surface-glass flex flex-col items-center gap-3 rounded-2xl p-10 text-center"
    >
      <EmptyIllustration />
      <p className="text-sm font-medium">Nothing found for &ldquo;{query}&rdquo;</p>
      <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
        Live map data is volunteer-built — some corners of the world are sparser
        than others. Try a nearby city or one of these:
      </p>
      <div className="flex flex-wrap justify-center gap-2 pt-1">
        {["salon in Pune", "gyms in Austin", "cafés in Berlin"].map((q) => (
          <Button
            key={q}
            variant="secondary"
            size="sm"
            className="rounded-full"
            onClick={() => onExample(q)}
          >
            {q}
          </Button>
        ))}
      </div>
    </motion.div>
  );
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="surface-glass flex flex-col items-center gap-3 rounded-2xl p-10 text-center"
    >
      <MapPinOff className="size-8 text-destructive/80" aria-hidden />
      <p className="text-sm font-medium">Map data is unreachable</p>
      <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
        The public data provider didn&apos;t answer. It&apos;s usually back in
        seconds — give it another go.
      </p>
      <Button size="sm" variant="secondary" className="mt-1 rounded-full" onClick={onRetry}>
        <RefreshCcw className="mr-1.5 size-3.5" aria-hidden />
        Retry
      </Button>
    </motion.div>
  );
}
