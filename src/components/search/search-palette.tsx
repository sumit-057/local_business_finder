"use client";

import { useEffect } from "react";
import { Clock, Sparkles } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { CATEGORIES } from "@/lib/categories";
import { useRecentSearches } from "@/lib/local-store";

/**
 * The Cmd/Ctrl+K palette: a faster doorway into the exact same Smart
 * Query flow as the main search box — no new data flow. Recent
 * searches and Category chips are selectable inline.
 */
export function SearchPalette({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (query: string) => void;
}) {
  const recentSearches = useRecentSearches();

  // Global Cmd/Ctrl+K toggle.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const run = (query: string) => {
    onOpenChange(false);
    onSubmit(query);
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search places"
      description="Type a Smart Query like “salon in Pune”"
      className="top-1/4"
    >
      <CommandInput
        placeholder='Try "salon in Pune"…'
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            const value = e.currentTarget.value.trim();
            if (value) run(value);
          }
        }}
      />
      <CommandList>
        <CommandEmpty>No matches — press Enter to search anyway.</CommandEmpty>
        {recentSearches.length > 0 && (
          <>
            <CommandGroup heading="Recent searches">
              {recentSearches.map((q) => (
                <CommandItem key={q} value={`recent ${q}`} onSelect={() => run(q)}>
                  <Clock className="text-muted-foreground" aria-hidden />
                  {q}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}
        <CommandGroup heading="Categories">
          {CATEGORIES.map((c) => (
            <CommandItem
              key={c.key}
              value={`category ${c.label}`}
              onSelect={() => run(c.exampleQuery)}
            >
              <Sparkles className="text-primary/70" aria-hidden />
              Browse {c.label.toLowerCase()}s
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
