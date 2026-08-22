import { notFound } from "next/navigation";
import { Workspace } from "@/components/search/workspace";
import { DEFAULT_QUERY } from "@/lib/categories";
import type { OsmType } from "@/lib/place";

export const metadata = { title: "Place" };

const OSM_TYPES = ["node", "way", "relation"];

/**
 * Shareable detail view. Direct loads preload the default query beneath
 * the slide-over so there is always list/map context; arriving from a
 * running search keeps that context via client-side history instead.
 */
export default async function PlacePage({
  params,
}: {
  params: Promise<{ osmType: string; id: string }>;
}) {
  const { osmType, id } = await params;
  const osmId = Number(id);
  if (!OSM_TYPES.includes(osmType) || !Number.isInteger(osmId) || osmId <= 0) {
    notFound();
  }

  return (
    <Workspace
      initialQuery={DEFAULT_QUERY}
      detail={{ osmType: osmType as OsmType, osmId }}
    />
  );
}
