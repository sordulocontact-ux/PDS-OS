import { cn } from "@/lib/utils";

/**
 * An outlined card of the Strategy: blue once chosen (docs/DESIGN.md § 4,
 * « Sélection et formulaires en étapes »), white with an outline otherwise.
 */
export const optionClass = (selected: boolean) =>
  cn(
    "flex min-w-0 items-start gap-3 rounded-2xl border px-4 py-3.5 text-left text-body-md transition-[background-color,border-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none",
    selected
      ? "border-[var(--selection-border)] bg-[var(--selection-bg)]"
      : "border-border bg-background enabled:hover:border-grey-300",
  );

/** Title of a Strategy section: the question or the block's name. */
export const sectionTitleClass =
  "text-display-sm font-semibold text-foreground";

/** Field label, above its control (the "Nouveau projet" form). */
export const labelClass = "text-body-md font-medium text-foreground";
