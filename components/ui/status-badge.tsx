import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Pill with a semantic tone (docs/DESIGN.md § 3): pale background, dark text.
// Tones come from lib/ui/state-tones.ts, never picked ad hoc.
const statusBadgeVariants = cva(
  "inline-flex shrink-0 items-center gap-1.5 rounded-pill font-medium whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral:
          "bg-[var(--tone-neutral-bg)] text-[color:var(--tone-neutral-fg)]",
        info: "bg-[var(--tone-info-bg)] text-[color:var(--tone-info-fg)]",
        warning:
          "bg-[var(--tone-warning-bg)] text-[color:var(--tone-warning-fg)]",
        success:
          "bg-[var(--tone-success-bg)] text-[color:var(--tone-success-fg)]",
        danger: "bg-[var(--tone-danger-bg)] text-[color:var(--tone-danger-fg)]",
        action: "bg-[var(--tone-action-bg)] text-[color:var(--tone-action-fg)]",
      },
      size: {
        sm: "h-5 px-2 text-[length:var(--type-caption)] leading-[var(--type-caption-lh)]",
        md: "h-[26px] px-3 text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)]",
      },
    },
    defaultVariants: {
      tone: "neutral",
      size: "md",
    },
  },
);

export function StatusBadge({
  tone,
  size,
  dot = false,
  className,
  children,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof statusBadgeVariants> & { dot?: boolean }) {
  return (
    <span
      data-slot="status-badge"
      className={cn(statusBadgeVariants({ tone, size }), className)}
      {...props}
    >
      {dot && <span aria-hidden className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export { statusBadgeVariants };
