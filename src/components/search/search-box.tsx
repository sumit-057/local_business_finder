"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SearchBox({
  initialQuery,
  onSubmit,
  busy,
}: {
  initialQuery: string;
  onSubmit: (query: string) => void;
  busy?: boolean;
}) {
  const [value, setValue] = useState(initialQuery);

  return (
    <form
      className="surface-glass flex w-full items-center gap-2 rounded-full p-1.5 pl-5 shadow-lg shadow-black/25 transition-all duration-300 focus-within:shadow-[0_0_32px_-6px_color-mix(in_oklab,var(--primary)_55%,transparent)] focus-within:ring-2 focus-within:ring-ring"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(value);
      }}
      role="search"
    >
      <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder='Try "salon in Pune"'
        aria-label="Search local businesses"
        className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        autoFocus
      />
      <Button
        size="sm"
        className="rounded-full shadow-[0_0_18px_-4px_color-mix(in_oklab,var(--primary)_70%,transparent)]"
        disabled={busy || !value.trim()}
      >
        {busy ? "Searching…" : "Search"}
      </Button>
    </form>
  );
}
