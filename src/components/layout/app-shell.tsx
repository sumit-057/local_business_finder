import { MapPin, Search } from "lucide-react";
import { BrandBar } from "@/components/layout/brand-bar";

/**
 * App-first shell: brand bar, search region, then the split
 * results/map workspace. Regions are slots — tickets fill them in.
 */
export function AppShell({
  search,
  results,
  map,
}: {
  search: React.ReactNode;
  results: React.ReactNode;
  map: React.ReactNode;
}) {
  return (
    <div className="app-backdrop flex min-h-svh flex-col">
      <BrandBar />
      <div className="mx-auto w-full max-w-7xl flex-1 px-4 pb-8 sm:px-6">
        <section aria-label="Search" className="pt-14 pb-10 sm:pt-20">
          {search}
        </section>
        <section
          aria-label="Results"
          className="grid gap-4 lg:grid-cols-[5fr_7fr]"
        >
          <div className="min-w-0">{results}</div>
          <div className="min-w-0">{map}</div>
        </section>
      </div>
    </div>
  );
}

export function RegionPlaceholder({
  icon,
  title,
  hint,
}: {
  icon: "search" | "map";
  title: string;
  hint: string;
}) {
  const Icon = icon === "search" ? Search : MapPin;
  return (
    <div className="surface-glass flex min-h-64 flex-col items-center justify-center gap-3 rounded-2xl p-8 text-center">
      <div className="flex size-11 items-center justify-center rounded-full bg-accent text-primary">
        <Icon className="size-5" />
      </div>
      <p className="text-sm font-medium">{title}</p>
      <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
        {hint}
      </p>
    </div>
  );
}
