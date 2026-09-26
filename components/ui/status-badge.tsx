import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Imported from Ibé's PO repository (po/components/ui/status-badge.tsx).

// Trois traitements, et seulement trois (DESIGN.md §1) :
// bloquant = encre pleine · normal = gris doux · en attente = contour vide.
const statusBadgeVariants = cva(
  "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border font-medium",
  {
    variants: {
      treatment: {
        blocked:
          "border-[color:var(--state-blocked-border)] bg-[var(--state-blocked-bg)] text-[color:var(--state-blocked-fg)]",
        normal:
          "border-transparent bg-[var(--state-normal-bg)] text-[color:var(--state-normal-fg)]",
        pending:
          "border-[color:var(--state-pending-border)] bg-transparent text-[color:var(--state-pending-fg)]",
      },
      size: {
        sm: "h-5 px-1.5 text-[length:var(--type-caption)] leading-[var(--type-caption-lh)]",
        md: "h-6 px-2 text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)]",
      },
    },
    defaultVariants: {
      treatment: "normal",
      size: "md",
    },
  },
);

export function StatusBadge({
  treatment,
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
      className={cn(statusBadgeVariants({ treatment, size }), className)}
      {...props}
    >
      {dot && <span aria-hidden className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export { statusBadgeVariants };
