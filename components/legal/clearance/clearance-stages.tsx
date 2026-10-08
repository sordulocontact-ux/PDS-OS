"use client";

import { IconCheck } from "nucleo-sharp-essential";

import { fr } from "@/lib/i18n/fr";
import type { ClearanceStatus } from "@/lib/legal/clearance/matrix";
import type { Clearance, Clearances } from "@/lib/legal/clearance/types";
import { formatFee } from "@/lib/legal/contracts/fields";
import { cn } from "@/lib/utils";

import { AskMoment } from "./ask-moment";
import { NegotiateMoment } from "./negotiate-moment";
import { SignMoment } from "./sign-moment";

// The ticket's nine states, as three moments for the person (the prototype
// of 07/10/2026): ask the rights holders, negotiate their conditions, get
// the contract signed with its proof.
const MOMENTS = ["ask", "negotiate", "sign"] as const;
type Moment = (typeof MOMENTS)[number];
const MOMENT_OF: Record<ClearanceStatus, number> = {
  to_investigate: 0,
  rightsholders_identified: 0,
  contacted: 1,
  waiting_external: 1,
  negotiating: 1,
  refused: 1,
  action_required: 1,
  agreement_reached: 2,
  document_pending: 2,
  signed: 2,
  cleared: 3,
  abandoned: 3,
};

/** The validated conditions in a few words (« 600 € · 5 % »). */
export function termsLine(clearance: Clearance): string {
  const terms = clearance.terms.find((x) => x.status === "validated");
  if (!terms) return "";
  return [
    terms.amountCents !== null ? formatFee(terms.amountCents) : null,
    terms.share,
    terms.credits,
  ]
    .filter(Boolean)
    .join(" · ");
}

/**
 * A borrowing in three moments: the current one open, with the one action
 * that ends it; the ones done said in a line; the ones to come said in a
 * line (Sacha, 07/10/2026: « reprends le même parcours que le prototype »).
 * Every state still moves through advance_clearance, which checks what it
 * needs.
 */
export function ClearanceStages({
  projectId,
  clearance,
  context,
}: {
  projectId: string;
  clearance: Clearance;
  context: Omit<Clearances, "items">;
}) {
  const t = fr.legalClearance.stages;
  const current = MOMENT_OF[clearance.status];

  const summary = (moment: Moment) => {
    if (moment === "ask")
      return t.summary.ask(
        clearance.scope ? fr.legalClearance.flow.scopes[clearance.scope] : "",
        clearance.holders.map((h) => h.name).join(", "),
      );
    if (moment === "negotiate")
      return termsLine(clearance) || t.summary.negotiate;
    return t.summary.sign;
  };

  return (
    <ol aria-label={t.label} className="flex flex-col">
      {MOMENTS.map((moment, index) => {
        const state =
          index < current ? "past" : index === current ? "current" : "future";
        return (
          <li
            key={moment}
            aria-current={state === "current" ? "step" : undefined}
            className="relative grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-3 pb-6 last:pb-0"
          >
            {/* The line to the next moment. */}
            {index < MOMENTS.length - 1 && (
              <span
                aria-hidden
                className={cn(
                  "absolute top-8 bottom-1 left-[0.8125rem] w-0.5 rounded-full",
                  state === "past"
                    ? "bg-[color:var(--tone-success-bg)]"
                    : "bg-border",
                )}
              />
            )}
            <span
              aria-hidden
              className={cn(
                "grid size-7 place-items-center rounded-full border-[1.5px] bg-background transition-colors duration-[var(--duration-base)]",
                state === "past" &&
                  "border-transparent bg-[color:var(--tone-success-bg)] text-[color:var(--tone-success-fg)]",
                state === "current" &&
                  "border-[7px] border-[color:var(--selection)]",
                state === "future" && "border-border",
              )}
            >
              {state === "past" && <IconCheck className="size-3.5" />}
            </span>
            <div className="flex min-h-7 flex-wrap items-baseline justify-between gap-x-3 pt-0.5">
              <h3
                className={cn(
                  "font-medium",
                  state === "future" && "text-muted-foreground",
                )}
              >
                {t[moment].title}
              </h3>
              {state === "past" && (
                <span className="text-sm text-muted-foreground">
                  {summary(moment)}
                </span>
              )}
            </div>
            {state === "future" && (
              <p className="col-start-2 text-sm text-muted-foreground">
                {t[moment].future}
              </p>
            )}
            {state === "current" && (
              <div className="col-start-2 flex animate-in flex-col gap-4 pt-3 duration-[var(--duration-slide)] ease-[var(--ease-out)] fade-in-0 slide-in-from-bottom-1 motion-reduce:animate-none">
                {moment === "ask" && (
                  <AskMoment projectId={projectId} clearance={clearance} />
                )}
                {moment === "negotiate" && (
                  <NegotiateMoment
                    projectId={projectId}
                    clearance={clearance}
                    canValidate={context.canValidate}
                  />
                )}
                {moment === "sign" && (
                  <SignMoment
                    projectId={projectId}
                    clearance={clearance}
                    context={context}
                  />
                )}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
