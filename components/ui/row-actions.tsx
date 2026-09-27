"use client";

import { IconDots } from "@/components/icons";
import { Button } from "@/components/ui/button";
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

// "⋯" of a list row or a page header: the row's actions in a menu. Nothing
// is rendered when the viewer has no action. `relative z-10` keeps it above
// the row's stretched link (DataTableLink).
export function RowActions({
  label,
  actions,
  size = "icon-sm",
}: {
  // Names the row: "Actions pour « … »".
  label: string;
  actions: RowAction[];
  size?: "icon-sm" | "icon-lg";
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
            className="relative z-10"
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
