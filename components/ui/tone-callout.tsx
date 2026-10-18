import { cva, type VariantProps } from "class-variance-authority";
import { IconCircleInfo, IconTriangleWarning } from "nucleo-sharp-essential";

import { IconCircleCheck, IconStop } from "@/components/icons";
import { cn } from "@/lib/utils";

// A short note on a tone's pale background (docs/DESIGN.md § 3): an
// hypothesis to confirm, a warning. The tone comes from lib/ui/state-tones.ts.
// Shape of the proto « Projet complet » (C0): radius 10, 12/14 padding, 15 px,
// the tone's icon on the left.
const toneCalloutVariants = cva(
  "flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-body-sm font-medium break-words",
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
    },
    defaultVariants: { tone: "neutral" },
  },
);

type Tone = NonNullable<VariantProps<typeof toneCalloutVariants>["tone"]>;

const TONE_ICON: Record<Tone, React.ComponentType<{ className?: string }>> = {
  neutral: IconCircleInfo,
  info: IconCircleInfo,
  warning: IconTriangleWarning,
  success: IconCircleCheck,
  danger: IconStop,
  action: IconCircleInfo,
};

/**
 * `icon`: replaces the tone's own icon (a lock on a locked step), or `false`
 * for none. `className` sets the box (margins, flex-1); `contentClassName`
 * lays out what it holds (a column, a row with a button).
 */
export function ToneCallout({
  tone,
  className,
  contentClassName,
  icon,
  as = "p",
  children,
  ...props
}: React.ComponentProps<"p"> &
  VariantProps<typeof toneCalloutVariants> & {
    // "div" when it holds a list or several paragraphs.
    as?: "p" | "div";
    icon?: React.ReactNode | false;
    contentClassName?: string;
  }) {
  const Tag = as;
  // A <p> may only hold phrasing content: its body is a span then.
  const Body = as === "div" ? "div" : "span";
  const ToneIcon = TONE_ICON[tone ?? "neutral"];
  return (
    <Tag className={cn(toneCalloutVariants({ tone }), className)} {...props}>
      {icon !== false && (
        <span
          aria-hidden
          className="flex h-[var(--type-body-sm-lh)] shrink-0 items-center [&_svg]:size-4"
        >
          {icon ?? <ToneIcon />}
        </span>
      )}
      <Body className={cn("block min-w-0 flex-1", contentClassName)}>
        {children}
      </Body>
    </Tag>
  );
}
