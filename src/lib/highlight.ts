/**
 * Shared highlight vocabulary for the list/map split view: the same
 * three states drive both a Place's card styling and its pin styling,
 * and both sides agree on the card element id used to bridge them.
 */

export type HighlightState = "idle" | "hovered" | "selected";

export function highlightStateFor(
  id: string,
  hoveredId: string | null,
  selectedId: string | null,
): HighlightState {
  if (id === selectedId) return "selected";
  if (id === hoveredId) return "hovered";
  return "idle";
}

/** DOM id of a Place's card — the one contract between pins and cards. */
export function placeCardElementId(id: string): string {
  return `place-card-${id}`;
}
