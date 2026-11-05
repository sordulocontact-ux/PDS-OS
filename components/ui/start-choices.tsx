import Link from "next/link";
import type { ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
import { startChoiceClass } from "@/components/ui/start-choice-class";
import { StartChoiceSubmit } from "@/components/ui/start-choice-submit";
import { StatusBadge } from "@/components/ui/status-badge";
import { decisions } from "@/lib/i18n/fr/decisions";
import { cn } from "@/lib/utils";

const fr = { decisions };

export type StartChoice = {
  value: string;
  title: string;
  // What the choice does, in one or two sentences.
  body: string;
  // The gesture, drawn as a button at the foot of the card (Figma PDS OS
  // 304:20801, the Cadrage): filled on the recommended card. Only a
  // drawing: the whole card stays the one target.
  action?: string;
  // The card is a link (a page that starts this way).
  href?: string;
  // The card runs this (from a client parent).
  onChoose?: () => void;
  // A fact of the way, beside its title (« Commencé le 28/10 »).
  badge?: string;
};

/**
 * How to start a step (docs/projet-complet/commons.md § 3, proto `.choice`):
 * cards side by side, the recommended one first, on the left, with its
 * pill (Sacha 29/10/2026), and under the cards the reason the code computed
 * (« Il manque … : un échange ira plus vite que des questions séparées. »). Clicking a card chooses and moves
 * on: no radio and no « Confirmer ». Each card is a link (`href`), a client
 * call (`onChoose`), or a submit of `formAction` with `name=value` (a
 * Server Action, from a server parent). A form choice that triggers nothing
 * is `ChoiceCards variant="list"` instead.
 */
export function StartChoices({
  choices,
  recommended,
  reason,
  formAction,
  name = "choice",
  legend,
  columns = 2,
  pending = null,
}: {
  choices: StartChoice[];
  recommended?: string | null;
  reason?: string | null;
  formAction?: (formData: FormData) => void | Promise<void>;
  name?: string;
  // The question above the cards (« Comment voulez-vous remplir le Brief ? »).
  legend?: string;
  columns?: 1 | 2;
  // The client choice running (`onChoose`): its card is busy, the others
  // wait (no second click while it runs).
  pending?: string | null;
}) {
  // The recommended card leads (on the left, side by side).
  const ordered = [...choices].sort(
    (a, b) =>
      Number(b.value === recommended) - Number(a.value === recommended),
  );
  const cards = ordered.map((choice) => {
    const isRecommended = choice.value === recommended;
    const inner = (
      <>
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-body-md font-semibold">{choice.title}</span>
          {isRecommended && (
            <StatusBadge tone="info" size="sm">
              {fr.decisions.start.recommended}
            </StatusBadge>
          )}
          {choice.badge && (
            <StatusBadge tone="neutral" size="sm">
              {choice.badge}
            </StatusBadge>
          )}
        </span>
        <span className="text-caption text-[color:var(--text-secondary)]">
          {choice.body}
        </span>
        {choice.action && (
          <span className="mt-auto pt-5">
            <span
              aria-hidden
              className={buttonVariants({
                variant: isRecommended ? "default" : "outline",
              })}
            >
              {choice.action}
            </span>
          </span>
        )}
      </>
    );
    if (choice.href)
      return (
        <Link key={choice.value} href={choice.href} className={startChoiceClass}>
          {inner}
        </Link>
      );
    if (formAction)
      return (
        <StartChoiceSubmit key={choice.value} name={name} value={choice.value}>
          {inner}
        </StartChoiceSubmit>
      );
    return (
      <button
        key={choice.value}
        type="button"
        className={startChoiceClass}
        disabled={pending !== null}
        aria-busy={pending === choice.value || undefined}
        onClick={choice.onChoose}
      >
        {inner}
      </button>
    );
  });

  // The reason sits under the cards, across the row (Sacha 29/10/2026).
  const grid: ReactNode = (
    <div
      className={cn("grid gap-3", columns === 2 && "sm:grid-cols-2")}
      role="group"
      aria-label={legend}
    >
      {cards}
      {reason && (
        <p className="col-span-full text-caption text-[color:var(--text-secondary)]">
          {reason}
        </p>
      )}
    </div>
  );
  return (
    <div className="flex flex-col gap-3">
      {legend && (
        <p className="text-body-md font-semibold">
          {legend}
        </p>
      )}
      {formAction ? <form action={formAction}>{grid}</form> : grid}
    </div>
  );
}
