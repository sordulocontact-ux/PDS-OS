import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

// Adapted to docs/DESIGN.md § 7: primary = black pill, secondary = outline,
// ghost = soft hover; colour/background transitions only, no scale or shadow.
// rounded-full, not rounded-pill: Tailwind sorts radius utilities by name, so
// only rounded-full lets the icon sizes' rounded-lg win.
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-full border border-transparent bg-clip-padding text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)] font-medium whitespace-nowrap no-underline transition-[background-color,border-color,color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] outline-none select-none disabled:pointer-events-none disabled:opacity-40 aria-invalid:border-[color:var(--border-strong)] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-[var(--control-primary-bg-hover)]",
        outline:
          "border-border bg-background text-foreground hover:border-grey-300 hover:bg-[var(--control-bg-hover)] active:bg-[var(--control-bg-pressed)] aria-expanded:bg-[var(--control-bg-hover)]",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[var(--control-bg-pressed)]",
        ghost:
          "text-foreground hover:bg-[var(--control-bg-hover)] active:bg-[var(--control-bg-pressed)] aria-expanded:bg-[var(--control-bg-hover)]",
        // No red in the system: a destructive action reads as a full-ink control.
        destructive: "bg-destructive text-destructive-foreground hover:bg-[var(--control-primary-bg-hover)]",
        link: "text-foreground underline underline-offset-4",
      },
      size: {
        default: "h-[var(--density-control-h)] gap-1.5 px-[var(--density-control-pad-x)]",
        xs: "h-6 gap-1 px-2.5 text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 px-3 text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-10 gap-3 px-5 text-[length:var(--type-body-lg)] leading-[var(--type-body-lg-lh)]",
        icon: "size-[var(--density-control-h)] rounded-lg",
        "icon-xs": "size-6 rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 rounded-lg",
        "icon-lg": "size-10 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
