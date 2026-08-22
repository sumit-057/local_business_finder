"use client";

import { createElement } from "react";
import {
  BedDouble,
  CakeSlice,
  Coffee,
  Dumbbell,
  GraduationCap,
  HeartPulse,
  Landmark,
  Laptop,
  MapPin,
  Pill,
  Scissors,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { matchPlaceCategory } from "@/lib/categories";
import { cn } from "@/lib/utils";

/**
 * Category-to-icon mapping and per-category gradient tiles: each
 * Category gets a recognizable glyph floating on its own color wash —
 * the "app icon" treatment that makes scan-reading effortless.
 */

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  salon: Scissors,
  gym: Dumbbell,
  cafe: Coffee,
  restaurant: UtensilsCrossed,
  pharmacy: Pill,
  bakery: CakeSlice,
  software: Laptop,
  hotel: BedDouble,
  hospital: HeartPulse,
  school: GraduationCap,
  bank: Landmark,
};

/** Jewel-toned washes; cycled by the Category table order. */
const GRADIENTS = [
  "from-violet-500/70 to-purple-600/50",
  "from-cyan-500/60 to-sky-600/50",
  "from-amber-500/65 to-orange-600/50",
  "from-emerald-500/60 to-teal-600/50",
  "from-rose-500/60 to-pink-600/50",
  "from-indigo-500/60 to-blue-600/50",
];

const KEY_ORDER = [
  "salon",
  "gym",
  "cafe",
  "restaurant",
  "pharmacy",
  "bakery",
  "software",
  "hotel",
  "hospital",
  "school",
  "bank",
];

export function CategoryIcon({
  placeCategory,
  className,
}: {
  placeCategory: string | null;
  className?: string;
}) {
  const cat = matchPlaceCategory(placeCategory);
  // createElement keeps this a lookup, not a component definition,
  // so the icon map stays a plain module-level table.
  return createElement(
    (cat && CATEGORY_ICONS[cat.key]) || MapPin,
    { className: cn("size-[18px]", className), "aria-hidden": true },
  );
}

export function categoryGradientClass(placeCategory: string | null): string {
  const cat = matchPlaceCategory(placeCategory);
  const i = cat ? KEY_ORDER.indexOf(cat.key) : -1;
  return GRADIENTS[i === -1 ? 0 : Math.abs(i) % GRADIENTS.length];
}
