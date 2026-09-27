import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// A short note on a tone's pale background (docs/DESIGN.md § 3): an
// hypothesis to confirm, a warning. The tone comes from lib/ui/state-tones.ts.
const toneCalloutVariants = cva(
  "rounded-2xl px-4 py-3 text-body-md font-medium break-words",
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
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export function ToneCallout({
  tone,
  className,
  ...props
}: React.ComponentProps<"p"> & VariantProps<typeof toneCalloutVariants>) {
  return (
    <p className={cn(toneCalloutVariants({ tone }), className)} {...props} />
  );
}
