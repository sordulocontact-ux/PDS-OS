import Link from "next/link";
import type { ReactNode } from "react";

import { startChoiceClass } from "@/components/ui/start-choice-class";
import { StartChoiceSubmit } from "@/components/ui/start-choice-submit";
import { StatusBadge } from "@/components/ui/status-badge";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

export type StartChoice = {
  value: string;
  title: string;
  // What the choice does, in one or two sentences.
  body: string;
  // The card is a link (a page that starts this way).
  href?: string;
  // The card runs this (from a client parent).
  onChoose?: () => void;
};

/**
 * How to start a step (docs/projet-complet/commons.md § 3, proto `.choice`):
 * cards side by side, the recommended one first with its pill, and under
 * the grid the reason the code computed (« Il manque … : un échange ira plus
 * vite que des questions séparées. »). Clicking a card chooses and moves
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
}: {
  choices: StartChoice[];
  recommended?: string | null;
  reason?: string | null;
  formAction?: (formData: FormData) => void | Promise<void>;
  name?: string;
  // The question above the cards (« Comment voulez-vous remplir le Brief ? »).
  legend?: string;
  columns?: 1 | 2;
}) {
  const ordered = [...choices].sort(
    (a, b) => Number(b.value === recommended) - Number(a.value === recommended),
  );
  const cards = ordered.map((choice) => {
    const inner = (
      <>
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-body-md font-semibold">{choice.title}</span>
          {choice.value === recommended && (
            <StatusBadge tone="info" size="sm">
              {fr.decisions.start.recommended}
            </StatusBadge>
          )}
        </span>
        <span className="text-caption text-[color:var(--text-secondary)]">
          {choice.body}
        </span>
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
        onClick={choice.onChoose}
      >
        {inner}
      </button>
    );
  });

  const grid: ReactNode = (
    <div
      className={cn("grid gap-3", columns === 2 && "sm:grid-cols-2")}
      role="group"
      aria-label={legend}
    >
      {cards}
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
      {reason && (
        <p className="text-caption text-[color:var(--text-secondary)]">
          {reason}
        </p>
      )}
    </div>
  );
}
