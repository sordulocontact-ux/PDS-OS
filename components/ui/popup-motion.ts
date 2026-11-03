// Motion of the portal popups (docs/DESIGN.md § 4, « Menus, popovers et
// info-bulles »). Opened tens of times a day, so barely there: they grow from
// their trigger (Base UI's --transform-origin) and leave faster than they came.

// Popover and DropdownMenu: opacity and scale(.97 → 1) in --duration-fast,
// out in --duration-instant; opacity only under reduced motion.
export const popupMotion =
  "origin-(--transform-origin) transition-opacity motion-safe:transition-[opacity,scale] duration-[var(--duration-fast)] ease-[var(--ease-out)] data-starting-style:opacity-0 motion-safe:data-starting-style:scale-[.97] data-ending-style:opacity-0 data-ending-style:duration-[var(--duration-instant)]";

// Tooltip: a fade only, and none when it opens at once from a neighbour
// (Base UI sets data-instant).
export const tooltipMotion =
  "transition-opacity duration-[var(--duration-fast)] ease-[var(--ease-out)] data-starting-style:opacity-0 data-ending-style:opacity-0 data-instant:transition-none";
