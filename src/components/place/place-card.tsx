import { Heart } from "lucide-react";
import { motion } from "motion/react";
import type { Place } from "@/lib/place";
import { placeCardElementId } from "@/lib/highlight";
import type { HighlightState } from "@/lib/highlight";
import { CategoryIcon, categoryGradientClass } from "@/lib/category-icons";
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
  const gradient = categoryGradientClass(place.category);

  return (
    <motion.article
      id={placeCardElementId(place.id)}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.4) }}
      className={`surface-glass group relative cursor-pointer overflow-hidden rounded-2xl p-0 transition-all duration-200 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring ${STATE_STYLES[state]}`}
      tabIndex={0}
      aria-label={place.name}
      aria-current={state === "selected" || undefined}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
      onFocus={onHoverStart}
      onBlur={onHoverEnd}
      onClick={onSelect}
    >
      {/* Edge-light + brand glow on hover */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            "linear-gradient(to bottom right, color-mix(in oklab, var(--primary) 14%, transparent), transparent 45%)",
          boxShadow:
            "inset 0 1px 0 color-mix(in oklab, white 12%, transparent), 0 8px 28px -10px color-mix(in oklab, var(--primary) 45%, transparent)",
        }}
      />

      <div className="relative flex items-start gap-3 p-3.5">
        <div
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-linear-to-br text-primary-foreground shadow-inner transition-transform duration-200 group-hover:scale-105",
            gradient,
          )}
        >
          <CategoryIcon placeCategory={place.category} className="size-5" />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold tracking-tight">
            {place.name}
          </h3>
          <p className="mt-0.5 truncate text-[11px] capitalize text-muted-foreground">
            {prettyCategory(place.category)}
          </p>
          <p className="mt-1 line-clamp-1 text-xs leading-relaxed text-muted-foreground/90">
            {place.address || "\u00A0"}
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
            aria-label={
              favorite
                ? `Remove ${place.name} from favorites`
                : `Save ${place.name} to favorites`
            }
            className="absolute top-2.5 right-2.5 shrink-0 rounded-full p-1.5 text-muted-foreground transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
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
