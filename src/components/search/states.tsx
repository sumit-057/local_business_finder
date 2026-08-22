"use client";

import { RefreshCcw } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  EmptyIllustration,
  ErrorIllustration,
} from "@/components/brand/illustrations";
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
      <ErrorIllustration />
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

/** Graceful fallback when geolocation is denied or unavailable. */
export function LocationDeniedState({
  onExample,
}: {
  onExample: (q: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="surface-glass mb-4 flex flex-col items-center gap-3 rounded-2xl p-8 text-center"
    >
      <ErrorIllustration />
      <p className="text-sm font-medium">We couldn&apos;t get your location</p>
      <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
        Your browser blocked location access or couldn&apos;t find you. You can
        still ask directly:
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
