"use client";

import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { IconCheck } from "nucleo-sharp-essential";

import { useSectionThemeClass } from "@/components/ui/dialog";
import { popupMotion } from "@/components/ui/popup-motion";
import { cn } from "@/lib/utils";

// Menu of the design system, on Base UI (keyboard, focus, typeahead): same
// surface and motion as the Popover (elevation 1, 10 px radius, hairline
// border), rows of 8 px radius.

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
  // In a portal, the menu takes its section's theme (Finance's smaller text).
  const section = useSectionThemeClass();
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
            popupMotion,
            section,
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

// One choice among a few, kept open on click so the change is seen (theme of
// the account menu): label in grey, check on the right as in SelectItem.
const DropdownMenuRadioGroup = MenuPrimitive.RadioGroup;
// Items under a label (DropdownMenuGroupLabel), without a choice.
const DropdownMenuGroup = MenuPrimitive.Group;

function DropdownMenuGroupLabel({
  className,
  ...props
}: MenuPrimitive.GroupLabel.Props) {
  return (
    <MenuPrimitive.GroupLabel
      className={cn(
        "px-3 pt-2 pb-1 text-caption text-[color:var(--text-tertiary)]",
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: MenuPrimitive.RadioItem.Props) {
  return (
    <MenuPrimitive.RadioItem
      className={cn(
        "flex min-h-10 cursor-default items-center gap-2.5 rounded-lg px-3 text-[length:var(--type-body-md)] font-medium outline-none select-none data-[disabled]:opacity-40 data-[highlighted]:bg-[var(--control-bg-hover)] [&_svg]:size-5 [&_svg]:shrink-0",
        className,
      )}
      {...props}
    >
      <span className="flex-1">{children}</span>
      <MenuPrimitive.RadioItemIndicator>
        <IconCheck aria-hidden />
      </MenuPrimitive.RadioItemIndicator>
    </MenuPrimitive.RadioItem>
  );
}

/** A choice that is on or off (the columns shown in a list): a real box
 * before its label, as the app's checkbox (sm: selection blue when ticked),
 * as the proto (Sacha 15/11/2026); the menu stays open while one ticks
 * several. */
function DropdownMenuCheckboxItem({
  className,
  children,
  ...props
}: MenuPrimitive.CheckboxItem.Props) {
  return (
    <MenuPrimitive.CheckboxItem
      closeOnClick={false}
      className={cn(
        "group/check flex min-h-10 cursor-default items-center gap-2.5 rounded-lg px-3 text-[length:var(--type-body-md)] font-medium outline-none select-none data-[disabled]:opacity-40 data-[highlighted]:bg-[var(--control-bg-hover)]",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden
        className="grid size-4 shrink-0 place-items-center rounded-sm border border-[color:var(--border-default)] bg-[var(--control-bg)] transition-colors duration-150 group-data-[checked]/check:border-selection group-data-[checked]/check:bg-selection-bg"
      >
        <MenuPrimitive.CheckboxItemIndicator>
          <IconCheck aria-hidden className="size-3 text-selection" />
        </MenuPrimitive.CheckboxItemIndicator>
      </span>
      <span className="flex-1">{children}</span>
    </MenuPrimitive.CheckboxItem>
  );
}

function DropdownMenuSeparator({
  className,
  ...props
}: MenuPrimitive.Separator.Props) {
  return (
    <MenuPrimitive.Separator
      className={cn("mx-2 my-1 h-px bg-[var(--border-hairline)]", className)}
      {...props}
    />
  );
}

export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuGroupLabel,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
};
