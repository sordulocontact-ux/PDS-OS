"use client";

import { useState } from "react";

import { DismissButton } from "@/components/deals/deal-call-proposals";
import { TermForm } from "@/components/deals/term-form";
import { EmptyNote } from "@/components/shell/empty-state";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FactCard, FactCards } from "@/components/ui/fact-card";
import { FactSourceText } from "@/components/ui/fact-row-frame";
import { FormDialog } from "@/components/ui/form-dialog";
import { routes } from "@/lib/auth/redirects";
import type { DealCallProposal } from "@/lib/deals/call-queries";
import { formatTermValue } from "@/lib/deals/term-format";
import type { DealTerm, TermFormat } from "@/lib/deals/terms";
import { dealCalls } from "@/lib/i18n/fr/deal-calls";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { deals } from "@/lib/i18n/fr/deals";
import { dealTermTone } from "@/lib/ui/state-tones";
import { formatInstantDay } from "@/lib/utils/instant";

const fr = { dealCalls, deals, dialogs };

type TermProposal = Extract<DealCallProposal, { kind: "term" }>;

// Words, not a figure: shown at reading size in their card.
const TEXT_FORMATS = new Set<TermFormat>(["text", "yesno", "split"]);

/**
 * The terms negotiated in a deal (BIZ 3): the ones written, one card each in
 * the configured order (Sacha 20/11/2026, proto « Fiche d'un deal » v2) — its
 * value, its state as a dot, who changed it last and when; then the ones still to define on one line (Sacha
 * 20/11/2026: nine rows « À définir » made the page a table), each a
 * button for whoever writes the deal. A card or a button opens the term in a
 * dialog; the history is in the deal's journal. What PO read in the deal's
 * calls is the card of its term, first, in the same grid (Sacha 21/11/2026:
 * « une section complète »): the value proposed, the passage it comes from,
 * « Vérifier » opens the term's form prefilled, « Écarter » sets it aside.
 */
export function DealTerms({
  dealId,
  terms,
  canWrite,
  proposals = [],
}: {
  dealId: string;
  terms: DealTerm[];
  canWrite: boolean;
  // PO's term proposals from the deal's calls, still to check.
  proposals?: TermProposal[];
}) {
  const t = fr.deals.terms;
  const [open, setOpen] = useState<{
    term: DealTerm;
    proposalId?: string;
  } | null>(null);
  const proposedKeys = new Set(proposals.map((p) => p.termKey));
  const termOfKey = new Map(terms.map((term) => [term.key, term]));
  const shown = terms.filter((term) => !proposedKeys.has(term.key));
  const written = shown.filter((term) => term.state !== "to_define");
  const toDefine = shown.filter((term) => term.state === "to_define");
  const label = (term: DealTerm) => t.labels[term.key] ?? term.key;
  const toDefineButtons = (className?: string) => (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {toDefine.map((term) => (
        <Button
          key={term.key}
          type="button"
          variant="outline"
          size="xs"
          onClick={() => setOpen({ term })}
          aria-label={t.editTitle(label(term))}
        >
          {label(term)}
        </Button>
      ))}
    </div>
  );
  return (
    <div className="flex flex-col gap-3">
      {(proposals.length > 0 || written.length > 0) && (
        <FactCards>
          {proposals.map((p) => {
            const term = termOfKey.get(p.termKey);
            if (!term) return null;
            return (
              <FactCard
                key={p.id}
                proposed
                label={label(term)}
                value={formatTermValue(term.format, p.value) ?? ""}
                text={TEXT_FORMATS.has(term.format)}
                state={{
                  tone: dealTermTone[p.state],
                  label: t.states[p.state],
                }}
                quote={
                  <FactSourceText
                    source={{
                      quote: p.quote,
                      from: fr.dealCalls.proposals.from(
                        p.callTitle,
                        formatInstantDay(p.callAt),
                      ),
                      href: routes.call(p.callId),
                    }}
                  />
                }
                action={
                  canWrite && (
                    <span className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setOpen({
                            term: { ...term, value: p.value, state: p.state },
                            proposalId: p.id,
                          })
                        }
                      >
                        {fr.dealCalls.proposals.check}
                      </Button>
                      <DismissButton dealId={dealId} id={p.id} />
                    </span>
                  )
                }
              />
            );
          })}
          {written.map((term) => {
            const name = label(term);
            return (
              <FactCard
                key={term.key}
                label={name}
                value={
                  formatTermValue(term.format, term.value) ?? t.states.to_define
                }
                text={TEXT_FORMATS.has(term.format)}
                state={{
                  tone: dealTermTone[term.state],
                  label: t.states[term.state],
                }}
                source={
                  term.changedBy && term.changedAt
                    ? t.changed(
                        term.changedBy,
                        formatInstantDay(term.changedAt),
                      )
                    : null
                }
                onClick={canWrite ? () => setOpen({ term }) : undefined}
                actionLabel={canWrite ? t.editTitle(name) : undefined}
              />
            );
          })}
        </FactCards>
      )}
      {toDefine.length > 0 &&
        (written.length === 0 && proposals.length === 0 ? (
          // None written yet: the empty note of the deal's other sections,
          // the terms to define as its buttons (Sacha 20/11/2026).
          <EmptyNote action={canWrite && toDefineButtons("justify-center")}>
            {t.noneWritten}
            {!canWrite && ` ${toDefine.map(label).join(", ")}`}
          </EmptyNote>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)]">
              {t.toDefine}
              {!canWrite && ` ${toDefine.map(label).join(", ")}`}
            </p>
            {canWrite && toDefineButtons()}
          </div>
        ))}
      <FormDialog
        open={open !== null}
        onOpenChange={(next) => !next && setOpen(null)}
        title={
          open ? t.editTitle(t.labels[open.term.key] ?? open.term.key) : ""
        }
        description={open ? t.states[open.term.state] : ""}
        closeLabel={fr.dialogs.close}
      >
        {open && (
          <TermForm
            dealId={dealId}
            term={open.term}
            proposalId={open.proposalId}
            onDone={() => setOpen(null)}
          />
        )}
      </FormDialog>
    </div>
  );
}
