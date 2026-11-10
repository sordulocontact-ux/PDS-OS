import { ButtonRoll, buttonGrow } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// FilterChip (docs/DESIGN.md § 7): pill, rest / hover / active. Active is
// full ink for a filter; "soft" (grey) for a selection that sits next to a
// black main button, so the two never look alike. Hover as a button: it
// grows and its label rolls (buttonGrow, ButtonRoll).
const chipClass = (
  active: boolean,
  className?: string,
  variant: "ink" | "soft" = "ink",
) =>
  cn(
    buttonGrow,
    "group/button inline-flex min-h-9 items-center gap-1.5 rounded-pill border px-3.5 py-1.5 text-left text-sm no-underline outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-40",
    // Primary, not foreground/background: the same ink on the page, and
    // still readable inside the glass modal, whose background is translucent.
    active &&
      variant === "ink" &&
      "border-primary bg-primary text-primary-foreground",
    active &&
      variant === "soft" &&
      "border-transparent bg-[var(--surface-sunken)] text-foreground",
    !active && "border-border bg-background text-foreground",
    !active &&
      variant === "ink" &&
      "hover:border-[color:var(--border-hover)] hover:bg-[var(--control-bg-hover)]",
    // Soft: the outline goes on hover, only the grey fill remains.
    !active &&
      variant === "soft" &&
      "hover:border-transparent hover:bg-[var(--control-bg-hover)]",
    className,
  );

// A toggle button: `pressed` is announced to assistive technologies.
export function FilterChip({
  pressed,
  variant,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<"button">, "aria-pressed"> & {
  pressed: boolean;
  variant?: "ink" | "soft";
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={chipClass(pressed, className, variant)}
      {...props}
    >
      <ButtonRoll>{children}</ButtonRoll>
    </button>
  );
}
