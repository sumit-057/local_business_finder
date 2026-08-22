import { Logomark } from "@/components/brand/logomark";
import { BRAND_NAME } from "@/lib/brand";

/**
 * Compact brand bar.
 */
export function BrandBar({ actions }: { actions?: React.ReactNode }) {
  return (
    <header className="surface-glass sticky top-0 z-40 border-x-0 border-t-0">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Logomark className="size-7" />
        <span className="text-[15px] font-semibold tracking-tight">
          {BRAND_NAME}
        </span>
        <span className="hidden text-xs text-muted-foreground sm:inline">
          /&nbsp;local businesses on live map data
        </span>
        <div className="ml-auto flex items-center gap-2">{actions}</div>
      </div>
    </header>
  );
}
