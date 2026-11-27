"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

import { IconDots } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { dialogs } from "@/lib/i18n/fr/dialogs";
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
  // A gesture (`onSelect`), a place to go (`href`, a link row), or a form
  // in a modal (`dialog`): a button of a row too full moved into « ⋯ »
  // (Sacha 27/11/2026: never three text buttons side by side).
  onSelect?: () => void;
  href?: string;
  dialog?: {
    title: string;
    description?: string;
    size?: "default" | "medium" | "wide";
    body: (close: () => void) => ReactNode;
  };
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
  const [open, setOpen] = useState<string | null>(null);
  if (actions.length === 0) return null;
  const close = () => setOpen(null);
  return (
    <>
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
        {actions.map(
          ({ key, label: itemLabel, icon: Icon, onSelect, href, dialog }) => (
            <DropdownMenuItem
              key={key}
              onClick={dialog ? () => setOpen(key) : onSelect}
              render={href ? <Link href={href} /> : undefined}
            >
              <Icon aria-hidden />
              {itemLabel}
            </DropdownMenuItem>
          ),
        )}
      </DropdownMenuContent>
    </DropdownMenu>
      {actions.map(
        ({ key, dialog }) =>
          dialog && (
            <FormDialog
              key={key}
              open={open === key}
              onOpenChange={(next) => !next && close()}
              title={dialog.title}
              description={dialog.description}
              closeLabel={dialogs.close}
              size={dialog.size}
            >
              {dialog.body(close)}
            </FormDialog>
          ),
      )}
    </>
  );
}
