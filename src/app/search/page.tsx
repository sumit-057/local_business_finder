import { redirect } from "next/navigation";
import { Workspace } from "@/components/search/workspace";
import { DEFAULT_QUERY } from "@/lib/categories";

export const metadata = { title: "Search" };

export default async function SearchPage({
  searchParams,
}: PageProps<"/search">) {
  const params = await searchParams;
  const raw = typeof params.q === "string" ? params.q : "";
  const query = raw.trim();

  // Default preload: land on a living, populated product.
  if (!query) redirect(`/search?q=${encodeURIComponent(DEFAULT_QUERY)}`);

  return <Workspace initialQuery={query} />;
}
