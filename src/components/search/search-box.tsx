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
      className="surface-glass flex w-full items-center gap-2 rounded-full p-1.5 pl-5 shadow-lg shadow-black/20 transition-shadow focus-within:shadow-primary/20 focus-within:ring-1 focus-within:ring-ring"
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
      <Button size="sm" className="rounded-full" disabled={busy || !value.trim()}>
        {busy ? "Searching…" : "Search"}
      </Button>
    </form>
  );
}
