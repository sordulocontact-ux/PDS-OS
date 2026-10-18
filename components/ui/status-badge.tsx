import { cva, type VariantProps } from "class-variance-authority";
import { hueClass } from "@/lib/ui/category-hues";
import { cn } from "@/lib/utils";

// Pill with a semantic tone (docs/DESIGN.md § 3) or a category hue (§ 3 ter):
// pale background, dark text. Tones come from lib/ui/state-tones.ts, hues
// from lib/ui/category-hues.ts, never picked ad hoc. Sizes of the proto
// « Projet complet » (C0): 24 px, 13 px semi-bold; `sm` 20 px for dense rows.
const statusBadgeVariants = cva(
  "inline-flex shrink-0 items-center gap-1.5 rounded-pill text-[length:var(--type-micro)] leading-[var(--type-micro-lh)] font-semibold whitespace-nowrap",
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
        // Category hues (lib/ui/category-hues.ts): no state, only "which one".
        ...hueClass,
      },
      size: {
        sm: "h-5 px-2",
        md: "h-6 px-2.5",
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
