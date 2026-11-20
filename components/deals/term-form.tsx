"use client";

import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { ChipChoice } from "@/components/ui/chip-choice";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { TermValueFields } from "@/components/deals/term-value-fields";
import { setDealTerm } from "@/lib/deals/term-actions";
import { readTermValue } from "@/lib/deals/term-input";
import { TERM_STATES, type DealTerm, type TermState } from "@/lib/deals/terms";
import { deals } from "@/lib/i18n/fr/deals";

const fr = { deals };

/**
 * « Modifier » a term of a deal (BIZ 3): its state first (proposed by PDS,
 * counter-proposal, confirmed, to define), then its value in its format,
 * prefilled with the current one. A missing value turns red at the first
 * try; « À définir » needs none. Opened on a proposal of PO (BIZ 6): `term`
 * carries the proposed value and state, saving applies `proposalId`.
 */
export function TermForm({
  dealId,
  term,
  proposalId,
  onDone,
}: {
  dealId: string;
  term: DealTerm;
  proposalId?: string;
  onDone: () => void;
}) {
  const t = fr.deals.terms;
  const [state, setState] = useState<TermState>(
    term.state === "to_define" ? "pds_proposal" : term.state,
  );
  const [missing, setMissing] = useState(false);
  const { pending, error, run } = useWriteSubmit(onDone, fr.deals.done.term);
  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        const value =
          state === "to_define"
            ? null
            : readTermValue(term.format, new FormData(event.currentTarget));
        setMissing(state !== "to_define" && value === null);
        if (state !== "to_define" && value === null) {
          event.currentTarget
            .querySelector<HTMLElement>("[data-term-value] input, textarea")
            ?.focus();
          return;
        }
        run(() =>
          setDealTerm({ dealId, key: term.key, state, value, proposalId }),
        );
      }}
    >
      <ChipChoice
        name="state"
        legend={t.fields.state}
        required
        fill
        options={TERM_STATES.map((value) => ({
          value,
          label: t.states[value],
        }))}
        value={state}
        onChange={(value) => value && setState(value)}
      />
      {state !== "to_define" && (
        <TermValueFields
          id={`term-${term.key}`}
          format={term.format}
          value={term.value}
          label={fr.deals.terms.labels[term.key] ?? term.key}
          error={missing ? fr.deals.errors.termValueRequired : undefined}
        />
      )}
      {missing && (
        <FormMessage kind="error">
          {fr.deals.errors.termValueRequired}
        </FormMessage>
      )}
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={t.save}
        onCancel={onDone}
      />
    </form>
  );
}
