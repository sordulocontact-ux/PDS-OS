
import { ViewLink } from "@/components/ui/view-link";
import { cn } from "@/lib/utils";

// FilterChip (docs/DESIGN.md § 7): pill, rest / hover / active (full ink).
const chipClass = (active: boolean, className?: string) =>
  cn(
    "inline-flex min-h-9 items-center gap-1.5 rounded-pill border px-3.5 py-1.5 text-left text-sm no-underline transition-[background-color,border-color,color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:pointer-events-none disabled:opacity-40",
    active
      ? "border-foreground bg-foreground text-background"
      : "border-border bg-background text-foreground hover:border-grey-300 hover:bg-[var(--control-bg-hover)]",
    className,
  );

// A toggle button: `pressed` is announced to assistive technologies.
export function FilterChip({
  pressed,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<"button">, "aria-pressed"> & { pressed: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={chipClass(pressed, className)}
      {...props}
    >
      {children}
    </button>
  );
}

// The same pill as a link, when the filter is in the URL: `current` is
// announced as the current page.
export function FilterChipLink({
  href,
  current,
  className,
  children,
}: {
  href: string;
  current: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <ViewLink
      href={href}
      aria-current={current ? "page" : undefined}
      className={chipClass(current, className)}
    >
      {children}
    </ViewLink>
  );
}
