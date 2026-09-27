"use client";

import { Menu as MenuPrimitive } from "@base-ui/react/menu";

import { cn } from "@/lib/utils";

// Menu of the design system, on Base UI (keyboard, focus, typeahead): same
// surface as the Popover (elevation 1, 10 px radius, hairline border), rows
// of 8 px radius, no motion (docs/DESIGN.md § 5, § 6).

const DropdownMenu = MenuPrimitive.Root;
const DropdownMenuTrigger = MenuPrimitive.Trigger;

function DropdownMenuContent({
  className,
  children,
  side = "bottom",
  align = "end",
  sideOffset = 4,
  ...props
}: MenuPrimitive.Popup.Props & {
  side?: MenuPrimitive.Positioner.Props["side"];
  align?: MenuPrimitive.Positioner.Props["align"];
  sideOffset?: number;
}) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        collisionPadding={16}
        className="z-50"
      >
        <MenuPrimitive.Popup
          className={cn(
            "flex min-w-44 flex-col rounded-[var(--radius-xl)] border border-border bg-popover p-1 text-popover-foreground shadow-elevation-1 outline-none",
            className,
          )}
          {...props}
        >
          {children}
        </MenuPrimitive.Popup>
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

function DropdownMenuItem({ className, ...props }: MenuPrimitive.Item.Props) {
  return (
    <MenuPrimitive.Item
      className={cn(
        "flex min-h-10 cursor-default items-center gap-2.5 rounded-lg px-3 text-[length:var(--type-body-md)] font-medium outline-none select-none data-[disabled]:opacity-40 data-[highlighted]:bg-[var(--control-bg-hover)] [&_svg]:size-5 [&_svg]:shrink-0",
        className,
      )}
      {...props}
    />
  );
}

export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
};
