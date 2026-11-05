"use client";

import { IconDots } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type RowAction = {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  onSelect: () => void;
};

// `reveal`: with a mouse, the button shows only while its row
// (`DataTableRow`, `group/row`) is hovered or holds the focus, or while its
// menu is open; on a touch screen (no hover) it always shows.
const REVEAL =
  "transition-opacity duration-[var(--duration-fast)] ease-[var(--ease-standard)] [@media(hover:hover)_and_(pointer:fine)]:opacity-0 [@media(hover:hover)_and_(pointer:fine)]:group-hover/row:opacity-100 [@media(hover:hover)_and_(pointer:fine)]:group-focus-within/row:opacity-100 focus-visible:opacity-100 data-[popup-open]:opacity-100";

// "⋯" of a list row or a page header: the row's actions in a menu. Nothing
// is rendered when the viewer has no action. `relative z-10` keeps it above
// the row's stretched link (DataTableLink).
export function RowActions({
  label,
  actions,
  size = "icon-sm",
  reveal = false,
}: {
  // Names the row: "Actions pour « … »".
  label: string;
  actions: RowAction[];
  size?: "icon-sm" | "icon-lg";
  reveal?: boolean;
}) {
  if (actions.length === 0) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant={size === "icon-lg" ? "outline" : "ghost"}
            size={size}
            aria-label={label}
            className={cn("relative z-10", reveal && REVEAL)}
          />
        }
      >
        <IconDots aria-hidden className="size-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {actions.map(({ key, label: itemLabel, icon: Icon, onSelect }) => (
          <DropdownMenuItem key={key} onClick={onSelect}>
            <Icon aria-hidden />
            {itemLabel}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
