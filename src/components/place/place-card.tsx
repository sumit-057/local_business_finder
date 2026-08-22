import { MapPin } from "lucide-react";
import { motion } from "motion/react";
import { Badge } from "@/components/ui/badge";
import type { Place } from "@/lib/place";

function prettyCategory(category: string | null): string {
  if (!category) return "Place";
  const tail = category.split("/").pop() ?? "place";
  return tail.replace(/_/g, " ");
}

export function PlaceCard({ place, index }: { place: Place; index: number }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.4) }}
      className="surface-glass group rounded-2xl p-4 transition-colors hover:border-primary/40"
      tabIndex={0}
      aria-label={place.name}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-primary transition-transform group-hover:scale-105">
          <MapPin className="size-4" aria-hidden />
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold tracking-tight">
            {place.name}
          </h3>
          <Badge
            variant="secondary"
            className="mt-1 rounded-full px-2 py-0 text-[11px] capitalize"
          >
            {prettyCategory(place.category)}
          </Badge>
          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {place.address}
          </p>
        </div>
      </div>
    </motion.article>
  );
}
