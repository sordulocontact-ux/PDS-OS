"use client";

import { useState } from "react";

import { TermForm } from "@/components/deals/term-form";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { FormDialog } from "@/components/ui/form-dialog";
import { formatTermValue } from "@/lib/deals/term-format";
import type { DealTerm } from "@/lib/deals/terms";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { deals } from "@/lib/i18n/fr/deals";
import { dealTermTone } from "@/lib/ui/state-tones";
import { formatInstantDay } from "@/lib/utils/instant";

const fr = { deals, dialogs };

/**
 * The terms negotiated in a deal (BIZ 3), one row each in the configured
 * order: its value (« À définir » until written), its state as a pill, who
 * changed it last and when under it. Whoever writes the deal opens a row to
 * change it in a dialog; the history is in the deal's journal.
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
  return (
    <>
      <FactRows>
        {terms.map((term) => {
          const label = t.labels[term.key] ?? term.key;
          return (
            <FactRow
              key={term.key}
              label={label}
              value={
                formatTermValue(term.format, term.value) ?? t.states.to_define
              }
              state={{
                tone: dealTermTone[term.state],
                label: t.states[term.state],
              }}
              source={
                term.changedBy && term.changedAt
                  ? t.changed(term.changedBy, formatInstantDay(term.changedAt))
                  : null
              }
              onClick={canWrite ? () => setOpen(term) : undefined}
              hrefLabel={canWrite ? t.editTitle(label) : undefined}
            />
          );
        })}
      </FactRows>
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
    </>
  );
}
