import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import type { ReactNode } from "react"

// Adapted to docs/DESIGN.md § 4 (« Boutons… », C0 of 18/10/2026, proto
// « Projet complet »): 40 px, 15 px semi-bold pills (sm 32 px, 14 px);
// primary = black pill, outline = border, ghost = grey text and soft hover.
// Hover (taken from Raw Studio): the button grows to 1.05 and its label rolls
// up while a copy comes in from below (ButtonRoll); a press scales to .97.
// Both are cut when motion is reduced; no shadow.
// rounded-full, not rounded-pill: Tailwind sorts radius utilities by name, so
// only rounded-full lets the icon sizes' rounded-lg win. Each variant sets its
// own border colour (never the base): buttonVariants() is also used raw on
// links, without cn(), and a base border-transparent sorted after
// border-border erased every outline (recette, 19/10/2026).
// No `outline-none` either: it erased the focus outline of app/globals.css
// (2 px, offset 2 px) on every button, invisible at the keyboard (test UX
// clavier du 12/11/2026).

// The hover growth of a button (and its colour transitions): 1.05 on hover,
// .97 on press, cut when motion is reduced. Shared with the pills that read as
// buttons (FilterChip, AttentionChips), so they grow exactly the same way.
const buttonGrow =
  "[transition:background-color_var(--duration-fast)_var(--ease-out),border-color_var(--duration-fast)_var(--ease-out),color_var(--duration-fast)_var(--ease-out),scale_var(--duration-grow)_var(--ease-out)] motion-safe:hover:scale-[1.05] motion-safe:active:scale-[.97]"

const buttonVariants = cva(
  `${buttonGrow} group/button inline-flex shrink-0 items-center justify-center rounded-full border bg-clip-padding text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] font-semibold whitespace-nowrap no-underline select-none disabled:pointer-events-none disabled:opacity-40 aria-invalid:border-[color:var(--border-strong)] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4`,
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-[var(--control-primary-bg-hover)]",
        outline:
          "border-border bg-background text-foreground hover:border-[color:var(--border-hover)] hover:bg-[var(--control-bg-hover)] active:bg-[var(--control-bg-pressed)] aria-expanded:bg-[var(--control-bg-hover)]",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-[var(--control-bg-pressed)]",
        ghost:
          "border-transparent text-[color:var(--text-secondary)] hover:bg-[var(--control-bg-hover)] hover:text-foreground active:bg-[var(--control-bg-pressed)] aria-expanded:bg-[var(--control-bg-hover)]",
        // No red in the system: a destructive action reads as a full-ink control.
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-[var(--control-primary-bg-hover)]",
        link: "border-transparent text-foreground underline underline-offset-4",
      },
      size: {
        default: "h-[var(--density-control-h)] gap-1.5 px-[var(--density-control-pad-x)]",
        xs: "h-6 gap-1 px-2.5 text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 px-3.5 text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] [&_svg:not([class*='size-'])]:size-3.5",
        // Same as the default since the proto has one size of button; kept
        // so the 300 existing calls need no change.
        lg: "h-[var(--density-control-h)] gap-2 px-5",
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

const rollLayer =
  "inline-flex w-full min-w-0 items-center [gap:inherit] [justify-content:inherit] transition-transform duration-[var(--duration-roll)] ease-[var(--ease-out)]"

// The label of a button rolls up on hover and a copy comes in from below.
// Wraps the content of every Button with text, and the content of an element
// styled with buttonVariants() (a link): the parent must carry group/button.
// It grows to fill a full-width button and inherits its gap and alignment, so
// the button lays out as before; the copy is hidden from assistive tech.
// Also in the controls that act like buttons (docs/DESIGN.md § 4): segments,
// tabs, sub-module pills, filter and attention chips; a current segment or
// tab leaves out group/button, so it stays still.
function ButtonRoll({ children }: { children: ReactNode }) {
  return (
    <span
      data-slot="button-roll"
      className="relative inline-flex min-w-0 grow items-center overflow-hidden [gap:inherit] [justify-content:inherit]"
    >
      <span className={cn(rollLayer, "motion-safe:group-hover/button:-translate-y-full")}>
        {children}
      </span>
      <span
        aria-hidden
        className={cn(
          rollLayer,
          "absolute inset-0 translate-y-full motion-safe:group-hover/button:translate-y-0 motion-reduce:hidden"
        )}
      >
        {children}
      </span>
    </span>
  )
}

function Button({
  className,
  variant = "default",
  size = "default",
  children,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  // An icon alone does not roll (Raw Studio rolls labels only).
  const rolls = !size?.startsWith("icon")
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {rolls ? <ButtonRoll>{children}</ButtonRoll> : children}
    </ButtonPrimitive>
  )
}

export { Button, ButtonRoll, buttonGrow, buttonVariants }
