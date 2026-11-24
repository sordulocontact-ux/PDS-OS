"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { IconXmark } from "nucleo-sharp-essential";
import { useEffect, type ComponentType, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { useSectionThemeClass } from "@/components/ui/dialog";
import {
  sidePanelClass,
  sidePanelScrimClass,
} from "@/components/ui/side-panel-class";
import { useShownOrder } from "@/components/ui/table-sort";
import { core } from "@/lib/i18n/fr/core";
import { cn } from "@/lib/utils";

const t = core.dialogs;

/**
 * The side sheet: the detail of a row one consults (docs/STYLE-FINANCE-
 * PARTOUT.md § 6.7; born in Finance, lot 3 of docs/FINANCE-V2.md, after
 * Midday's right panels). A panel floating on the right (sidePanelClass),
 * the row's name as its title beside the close button, then its content; no
 * counter, no arrows. The list stays in sight under the app's dark scrim;
 * ↑ ↓ go to the row before or after from the keyboard, in the order the
 * table shows when it is sorted (`TableSortProvider` around the table and
 * the sheet, `useShownOrder`), Échap closes. Under
 * `sm`, it takes the whole width. It takes its section's theme
 * (useSectionThemeClass), though it is drawn in a portal.
 */
export function SideSheet({
  open,
  onClose,
  title,
  index,
  total,
  onMove,
  bar,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  // A record one reads more than an amount (a Réseau contact, after
  // Accordee): the title small on a bar with a hairline, its icon before
  // it and its gestures (expand, "⋯") before the close; the content shows
  // the name large itself.
  bar?: {
    icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
    actions?: ReactNode;
  };
  // 0-based place of the row in its list, and the list's length.
  index: number;
  total: number;
  onMove: (to: number) => void;
  children: ReactNode;
}) {
  // A sorted table: the row's place on screen, and the row at a place.
  const shown = useShownOrder();
  const sorted = shown !== null && shown.length === total;
  useEffect(() => {
    if (!open) return;
    const at = sorted ? shown.indexOf(index) : index;
    const go = (to: number) => onMove(sorted ? shown[to] : to);
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable]")) return;
      if (e.key === "ArrowDown" && at >= 0 && at < total - 1) {
        e.preventDefault();
        go(at + 1);
      }
      if (e.key === "ArrowUp" && at > 0) {
        e.preventDefault();
        go(at - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, index, total, onMove, shown, sorted]);
  const theme = useSectionThemeClass();

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => !next && onClose()}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className={sidePanelScrimClass} />
        <DialogPrimitive.Popup
          data-slot="side-sheet"
          className={cn(sidePanelClass, theme)}
        >
          {bar ? (
            <div className="flex h-14 shrink-0 items-center gap-2 border-b border-[color:var(--border-hairline)] pr-3 pl-5">
              <bar.icon
                aria-hidden
                className="size-4 shrink-0 text-[color:var(--text-secondary)]"
              />
              <DialogPrimitive.Title className="min-w-0 flex-1 truncate text-[length:var(--type-body-md)] font-medium">
                {title}
              </DialogPrimitive.Title>
              {bar.actions}
              <SheetClose />
            </div>
          ) : (
            <div className="flex items-start gap-3 px-6 pt-6 pb-2">
              <DialogPrimitive.Title className="min-w-0 flex-1 text-display-sm font-medium break-words">
                {title}
              </DialogPrimitive.Title>
              <SheetClose className="-mt-1 -mr-2" />
            </div>
          )}
          <div
            className={cn(
              "flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 pb-6",
              bar ? "pt-6" : "pt-2",
            )}
          >
            {children}
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function SheetClose({ className }: { className?: string }) {
  return (
    <DialogPrimitive.Close
      render={<Button variant="ghost" size="icon-sm" className={className} />}
    >
      <IconXmark aria-hidden />
      <span className="sr-only">{t.close}</span>
    </DialogPrimitive.Close>
  );
}

/** The head of a sheet's content: where the row belongs, its amount large,
 * and a line under it (excl. tax, a state). Its name is the sheet's title. */
export function SheetHead({
  eyebrow,
  amount,
  positive = false,
  caption,
}: {
  eyebrow: ReactNode;
  amount?: string;
  // Money in: the amount in the app's green (SignedAmount).
  positive?: boolean;
  caption?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-caption text-[color:var(--text-tertiary)]">
        {eyebrow}
      </p>
      {amount && (
        <p
          className={cn(
            "text-display-lg tabular-nums",
            positive && "text-[color:var(--tone-success-fg)]",
          )}
        >
          {amount}
        </p>
      )}
      {caption && (
        <div className="flex flex-wrap items-center gap-2 text-caption text-[color:var(--text-secondary)]">
          {caption}
        </div>
      )}
    </div>
  );
}

/** Label / value lines of a sheet, a hairline between each. */
export function SheetFacts({
  facts,
}: {
  facts: { label: string; value: ReactNode }[];
}) {
  return (
    <dl className="flex flex-col border-t border-[color:var(--border-hairline)]">
      {facts.map((f) => (
        <div
          key={f.label}
          className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)] items-baseline gap-3 border-b border-[color:var(--border-hairline)] py-2.5"
        >
          <dt className="text-caption text-[color:var(--text-tertiary)]">
            {f.label}
          </dt>
          <dd className="m-0 min-w-0 break-words">{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}
