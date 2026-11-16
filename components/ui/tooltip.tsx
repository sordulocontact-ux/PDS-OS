"use client";

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";

import { tooltipMotion } from "@/components/ui/popup-motion";
import { cn } from "@/lib/utils";

// Tooltip of the design system: elevation 1, small radius, hairline border,
// a short fade (popup-motion.ts). Used for the collapsed sidebar, where an
// icon-only item still needs its label on hover/focus.

const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
// Shown fast (Sacha 15/11/2026: an icon button's name « au survol,
// rapidement »), as soon as the pointer rests.
function TooltipTrigger({
  delay = 150,
  ...props
}: TooltipPrimitive.Trigger.Props) {
  return <TooltipPrimitive.Trigger delay={delay} {...props} />;
}

function TooltipContent({
  className,
  children,
  side = "right",
  align = "center",
  sideOffset = 8,
  ...props
}: TooltipPrimitive.Popup.Props & {
  side?: TooltipPrimitive.Positioner.Props["side"];
  align?: TooltipPrimitive.Positioner.Props["align"];
  sideOffset?: number;
}) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        collisionPadding={16}
        className="z-50"
      >
        <TooltipPrimitive.Popup
          className={cn(
            "rounded-[var(--radius-md)] border border-border bg-popover px-2.5 py-1.5 text-caption text-popover-foreground shadow-elevation-1 outline-none",
            tooltipMotion,
            className,
          )}
          {...props}
        >
          {children}
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
