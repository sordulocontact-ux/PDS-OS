"use client";

import { Popover as PopoverPrimitive } from "@base-ui/react/popover";

import { cn } from "@/lib/utils";

// Popover of the design system (docs/DESIGN.md § 5): elevation 1, 10 px
// radius, hairline border, no motion (§ 6).

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverClose = PopoverPrimitive.Close;

function PopoverContent({
  className,
  children,
  side = "bottom",
  align = "end",
  sideOffset = 8,
  ...props
}: PopoverPrimitive.Popup.Props & {
  side?: PopoverPrimitive.Positioner.Props["side"];
  align?: PopoverPrimitive.Positioner.Props["align"];
  sideOffset?: number;
}) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        collisionPadding={16}
        className="z-50"
      >
        <PopoverPrimitive.Popup
          className={cn(
            "flex max-h-[min(32rem,var(--available-height))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-[var(--radius-xl)] border border-border bg-popover text-popover-foreground shadow-elevation-1 outline-none",
            className,
          )}
          {...props}
        >
          {children}
        </PopoverPrimitive.Popup>
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  );
}

function PopoverTitle({ className, ...props }: PopoverPrimitive.Title.Props) {
  return (
    <PopoverPrimitive.Title
      className={cn("text-sm font-medium", className)}
      {...props}
    />
  );
}

export { Popover, PopoverClose, PopoverContent, PopoverTitle, PopoverTrigger };
