"use client";

import { useState } from "react";

import { ButtonRoll, buttonGrow } from "@/components/ui/button";
import { ViewLink } from "@/components/ui/view-link";
import { stepTools } from "@/lib/i18n/fr/step-tools";
import { cn } from "@/lib/utils";

import { NotesDialog, type NotesDialogProps } from "./notes-dialog";

const fr = { stepTools };

const t = fr.stepTools.chips;

const CHIP =
  "inline-flex h-[34px] items-center gap-2 rounded-pill border border-[color:var(--border-hairline)] bg-card px-3 text-caption font-medium text-foreground";
// A chip that opens something: hover as a button (it grows, its label rolls).
const ACTION_CHIP = cn(
  CHIP,
  buttonGrow,
  "group/button hover:bg-[var(--control-bg-hover)]",
);
const DOT = {
  danger: "bg-[var(--tone-danger-fg)]",
  warning: "bg-[var(--tone-warning-fg)]",
  info: "bg-[var(--tone-info-fg)]",
} as const;

function Dot({ tone }: { tone: keyof typeof DOT }) {
  return <span aria-hidden className={cn("size-2 rounded-full", DOT[tone])} />;
}

/**
 * What is open in the module, under « Maintenant » (proto strip): « n
 * blocages » (opens the blocked step), « n éléments à revoir » (opens
 * Travail), « n informations à confirmer » (opens « Informations et
 * décisions »). Nothing when all three are at zero.
 */
export function AttentionChips({
  blockers,
  blockersHref,
  review = 0,
  reviewHref,
  toConfirm,
  dialog,
}: {
  blockers: number;
  blockersHref?: string;
  review?: number;
  reviewHref?: string;
  toConfirm: number;
  dialog: NotesDialogProps;
}) {
  const [open, setOpen] = useState(false);
  if (!blockers && !review && !toConfirm) return null;
  return (
    <div aria-label={t.label} className="flex flex-wrap gap-2">
      {blockers > 0 &&
        (blockersHref ? (
          <ViewLink href={blockersHref} className={ACTION_CHIP}>
            <ButtonRoll>
              <Dot tone="danger" />
              {t.blockers(blockers)}
            </ButtonRoll>
          </ViewLink>
        ) : (
          <span className={CHIP}>
            <Dot tone="danger" />
            {t.blockers(blockers)}
          </span>
        ))}
      {review > 0 && reviewHref && (
        <ViewLink href={reviewHref} className={ACTION_CHIP}>
          <ButtonRoll>
            <Dot tone="warning" />
            {t.review(review)}
          </ButtonRoll>
        </ViewLink>
      )}
      {toConfirm > 0 && (
        <button
          type="button"
          className={ACTION_CHIP}
          onClick={() => setOpen(true)}
        >
          <ButtonRoll>
            <Dot tone="info" />
            {t.toConfirm(toConfirm)}
          </ButtonRoll>
        </button>
      )}
      <NotesDialog {...dialog} open={open} onOpenChange={setOpen} />
    </div>
  );
}
