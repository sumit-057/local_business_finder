import { List, Map as MapIcon, MapPin, Search } from "lucide-react";
import { BrandBar } from "@/components/layout/brand-bar";
import { DotField } from "@/components/fx/dot-field";
import { cn } from "@/lib/utils";

/**
 * App-first shell: brand bar, search region, then the split
 * results/map workspace. Desktop is always a split view; below `lg`
 * a segmented toggle switches full-screen panes.
 */
export function AppShell({
  search,
  results,
  map,
  mobileView = "list",
  onMobileViewChange,
}: {
  search: React.ReactNode;
  results: React.ReactNode;
  map: React.ReactNode;
  mobileView?: "list" | "map";
  onMobileViewChange?: (view: "list" | "map") => void;
}) {
  const panes: Array<{ key: "list" | "map"; label: string; icon: typeof List }> = [
    { key: "list", label: "List", icon: List },
    { key: "map", label: "Map", icon: MapIcon },
  ];

  return (
    <div className="app-backdrop flex min-h-svh flex-col">
      <DotField className="pointer-events-none fixed inset-0 z-0 opacity-60" />
      <BrandBar />
      <main className="relative z-10 mx-auto w-full max-w-7xl flex-1 px-4 pb-8 sm:px-6">
        <section aria-label="Search" className="pt-14 pb-10 sm:pt-20">
          {search}
        </section>
        <div
          className="surface-glass mb-4 inline-flex gap-1 rounded-full p-1 lg:hidden"
          role="group"
          aria-label="Switch between list and map"
        >
          {panes.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              aria-pressed={mobileView === key}
              onClick={() => onMobileViewChange?.(key)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition-colors",
                mobileView === key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-3.5" aria-hidden />
              {label}
            </button>
          ))}
        </div>
        <section
          id="results"
          aria-label="Results"
          className="grid scroll-mt-20 gap-4 lg:grid-cols-[5fr_7fr]"
        >
          <div
            className={cn("min-w-0", mobileView === "map" && "hidden lg:block")}
          >
            {results}
          </div>
          <div
            className={cn(
              "min-w-0 lg:sticky lg:top-[4.5rem] lg:self-start",
              mobileView === "map" && "hidden lg:block",
            )}
          >
            {map}
          </div>
        </section>
      </main>
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
