import L from "leaflet";

export type PinState = "idle" | "hovered" | "selected";

/** Custom teardrop-less dot pin matching the dark-premium palette. */
export function pinIcon(state: PinState): L.DivIcon {
  const modifier = state === "idle" ? "" : ` is-${state}`;
  return L.divIcon({
    className: "place-pin-anchor",
    html: `<span class="place-pin${modifier}"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}
