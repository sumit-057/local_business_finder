import { Search } from "lucide-react";
import { AppShell, RegionPlaceholder } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <AppShell
      search={
        <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Find local businesses on{" "}
            <span className="bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              live map data
            </span>
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground text-pretty">
            One box. Real places. Try something like &ldquo;salon in
            Pune&rdquo; or &ldquo;gyms in Austin&rdquo;.
          </p>
          <form className="surface-glass flex w-full items-center gap-2 rounded-full p-1.5 pl-5 shadow-lg shadow-black/20">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              type="search"
              disabled
              placeholder="salon in Pune"
              aria-label="Search local businesses"
              className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <Button disabled size="sm" className="rounded-full">
              Search
            </Button>
          </form>
        </div>
      }
      results={
        <RegionPlaceholder
          icon="search"
          title="Results land here"
          hint="A responsive card grid of places, synced with the map — arriving in the next tickets."
        />
      }
      map={
        <RegionPlaceholder
          icon="map"
          title="Live map lands here"
          hint="Free OpenStreetMap tiles with a pin per place, hover-synced with the list."
        />
      }
    />
  );
}
