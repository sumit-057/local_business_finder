import { Heart, MapPin } from "lucide-react";
import { motion } from "motion/react";
import { Badge } from "@/components/ui/badge";
import type { Place } from "@/lib/place";
import { placeCardElementId } from "@/lib/highlight";
import type { HighlightState } from "@/lib/highlight";
import { cn } from "@/lib/utils";

function prettyCategory(category: string | null): string {
  if (!category) return "Place";
  const tail = category.split("/").pop() ?? "place";
  return tail.replace(/_/g, " ");
}

const STATE_STYLES: Record<HighlightState, string> = {
  idle: "",
  hovered: "border-primary/60 bg-accent/40",
  selected: "border-primary bg-accent/60",
};

export function PlaceCard({
  place,
  index,
  state = "idle",
  favorite = false,
  onHoverStart,
  onHoverEnd,
  onSelect,
  onToggleFavorite,
}: {
  place: Place;
  index: number;
  state?: HighlightState;
  favorite?: boolean;
  onHoverStart?: () => void;
  onHoverEnd?: () => void;
  onSelect?: () => void;
  onToggleFavorite?: () => void;
}) {
  return (
    <motion.article
      id={placeCardElementId(place.id)}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.4) }}
      className={`surface-glass group cursor-pointer rounded-2xl p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-black/30 focus-visible:ring-2 focus-visible:ring-ring ${STATE_STYLES[state]}`}
      tabIndex={0}
      aria-label={place.name}
      aria-current={state === "selected" || undefined}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
      onFocus={onHoverStart}
      onBlur={onHoverEnd}
      onClick={onSelect}
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
        {onToggleFavorite && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            aria-pressed={favorite}
            aria-label={favorite ? `Remove ${place.name} from favorites` : `Save ${place.name} to favorites`}
            className="ml-auto shrink-0 self-start rounded-full p-1.5 text-muted-foreground transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Heart
              className={cn(
                "size-4 transition-transform hover:scale-110",
                favorite && "fill-primary text-primary",
              )}
              aria-hidden
            />
          </button>
        )}
      </div>
    </motion.article>
  );
}
