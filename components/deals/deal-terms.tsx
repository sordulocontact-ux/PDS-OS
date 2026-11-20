"use client";

import { useState } from "react";

import { TermForm } from "@/components/deals/term-form";
import { Button } from "@/components/ui/button";
import { FactCard, FactCards } from "@/components/ui/fact-card";
import { FormDialog } from "@/components/ui/form-dialog";
import { formatTermValue } from "@/lib/deals/term-format";
import type { DealTerm, TermFormat } from "@/lib/deals/terms";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { deals } from "@/lib/i18n/fr/deals";
import { dealTermTone } from "@/lib/ui/state-tones";
import { formatInstantDay } from "@/lib/utils/instant";

const fr = { deals, dialogs };

// Words, not a figure: shown at reading size in their card.
const TEXT_FORMATS = new Set<TermFormat>(["text", "yesno", "split"]);

/**
 * The terms negotiated in a deal (BIZ 3): the ones written, one card each in
 * the configured order (Sacha 20/11/2026, proto « Fiche d'un deal » v2) — its
 * value, its state as a dot, who changed it last and when; then the ones still to define on one line (Sacha
 * 20/11/2026: nine rows « À définir » made the page a table), each a
 * button for whoever writes the deal. A card or a button opens the term in a
 * dialog; the history is in the deal's journal.
 */
export function DealTerms({
  dealId,
  terms,
  canWrite,
}: {
  dealId: string;
  terms: DealTerm[];
  canWrite: boolean;
}) {
  const t = fr.deals.terms;
  const [open, setOpen] = useState<DealTerm | null>(null);
  const written = terms.filter((term) => term.state !== "to_define");
  const toDefine = terms.filter((term) => term.state === "to_define");
  const label = (term: DealTerm) => t.labels[term.key] ?? term.key;
  return (
    <div className="flex flex-col gap-3">
      {written.length > 0 && (
        <FactCards>
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
                onClick={canWrite ? () => setOpen(term) : undefined}
                actionLabel={canWrite ? t.editTitle(name) : undefined}
              />
            );
          })}
        </FactCards>
      )}
      {toDefine.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)]">
            {written.length === 0 ? t.noneWritten : t.toDefine}
            {!canWrite && ` ${toDefine.map(label).join(", ")}`}
          </p>
          {canWrite && (
            <div className="flex flex-wrap gap-2">
              {toDefine.map((term) => (
                <Button
                  key={term.key}
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => setOpen(term)}
                  aria-label={t.editTitle(label(term))}
                >
                  {label(term)}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}
      <FormDialog
        open={open !== null}
        onOpenChange={(next) => !next && setOpen(null)}
        title={open ? t.editTitle(t.labels[open.key] ?? open.key) : ""}
        description={open ? t.states[open.state] : ""}
        closeLabel={fr.dialogs.close}
      >
        {open && (
          <TermForm dealId={dealId} term={open} onDone={() => setOpen(null)} />
        )}
      </FormDialog>
    </div>
  );
}
