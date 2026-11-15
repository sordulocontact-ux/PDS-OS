"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import {
  IconChevronDown,
  IconChevronUp,
  IconXmark,
} from "nucleo-sharp-essential";
import { useEffect, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { financeSheet } from "@/lib/i18n/fr/finance-home";

const t = financeSheet;

/**
 * Finance's side sheet (lot 3, docs/FINANCE-V2.md, after Midday): a row of a
 * list opens on the right, the list still in sight under a light veil; ↑ ↓
 * (keys or buttons) go to the row before or after without closing, Échap
 * closes. Deliberate gap from « one modal » (Sacha 07/11/2026), Finance
 * only (DESIGN.md). Under `sm`, it takes the whole width. Inside
 * `.finance-scope`, as its page, though it is drawn in a portal.
 */
export function FinanceSheet({
  open,
  onClose,
  title,
  index,
  total,
  onMove,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  // 0-based place of the row in its list, and the list's length.
  index: number;
  total: number;
  onMove: (to: number) => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable]")) return;
      if (e.key === "ArrowDown" && index < total - 1) {
        e.preventDefault();
        onMove(index + 1);
      }
      if (e.key === "ArrowUp" && index > 0) {
        e.preventDefault();
        onMove(index - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, index, total, onMove]);

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => !next && onClose()}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-[color-mix(in_srgb,var(--surface-page)_45%,transparent)] transition-opacity duration-[var(--duration-base)] data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <DialogPrimitive.Popup
          data-slot="finance-sheet"
          className="finance-scope fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-[color:var(--border-default)] bg-[var(--surface-raised)] text-foreground shadow-elevation-modal transition-[translate,opacity] duration-[var(--duration-base)] ease-[var(--ease-out)] outline-none data-ending-style:translate-x-6 data-ending-style:opacity-0 data-starting-style:translate-x-6 data-starting-style:opacity-0 motion-reduce:transition-opacity sm:w-[min(560px,100%)]"
        >
          <div className="flex items-center gap-2 border-b border-[color:var(--border-hairline)] px-4 py-3">
            <DialogPrimitive.Title className="sr-only">
              {title}
            </DialogPrimitive.Title>
            <span className="flex-1 text-caption text-[color:var(--text-tertiary)] tabular-nums">
              {t.position(index + 1, total)}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label={t.previous}
              disabled={index <= 0}
              onClick={() => onMove(index - 1)}
            >
              <IconChevronUp aria-hidden />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label={t.next}
              disabled={index >= total - 1}
              onClick={() => onMove(index + 1)}
            >
              <IconChevronDown aria-hidden />
            </Button>
            <DialogPrimitive.Close
              render={<Button variant="ghost" size="icon-sm" />}
            >
              <IconXmark aria-hidden />
              <span className="sr-only">{t.close}</span>
            </DialogPrimitive.Close>
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 py-5">
            {children}
          </div>
          <div className="hidden items-center gap-2 border-t border-[color:var(--border-hairline)] px-4 py-2.5 text-caption text-[color:var(--text-tertiary)] sm:flex">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd>
            <span className="flex-1">{t.keys}</span>
            <Kbd>Échap</Kbd>
            <span>{t.escape}</span>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** The head of a sheet: where the row belongs, its name, its amount large,
 * and a line under it (excl. tax, a state). */
export function SheetHead({
  eyebrow,
  title,
  amount,
  caption,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  amount?: string;
  caption?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-caption text-[color:var(--text-tertiary)]">
        {eyebrow}
      </p>
      <h2 className="text-display-sm font-semibold">{title}</h2>
      {amount && <p className="text-display-lg tabular-nums">{amount}</p>}
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
