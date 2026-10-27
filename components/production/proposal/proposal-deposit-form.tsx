"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { useLinkSubmit } from "@/components/production/provider/use-link-submit";
import { Button } from "@/components/ui/button";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { productionProposal } from "@/lib/i18n/fr/production-proposal";
import { depositProposal } from "@/lib/production/proposal/actions";
import { depositProposalByLink } from "@/lib/production/provider/proposal-link-actions";

const fr = { productionProposal };

const t = fr.productionProposal;
const HTTPS = /^https:\/\/\S+$/;

export type ProposalPlace =
  | { kind: "app"; projectId: string; sheetId: string }
  | { kind: "link"; token: string };

/**
 * « Déposer la proposition Vn » (proto creativeDeposit): the treatment,
 * the moodboard and the technical découpage — the links of their PDFs, the
 * treatment and the découpage required —, a note for PDS. In the step for
 * a director with an account (or whoever organises, for him), on the
 * director's private link otherwise.
 */
export function ProposalDepositForm({
  place,
  number,
  asked,
}: {
  place: ProposalPlace;
  number: number;
  // « PDS demande une nouvelle version : « … » ».
  asked: string | null;
}) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const app = useWriteSubmit(() => undefined, t.deposit.done(number));
  const link = useLinkSubmit();
  const pending = app.pending || link.pending;
  const error = app.error ?? link.error;
  return (
    <form
      noValidate
      className="flex flex-col gap-4 rounded-xl bg-[var(--surface-soft)] p-4"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        const v = (k: string) => String(data.get(k) ?? "").trim();
        const next: Record<string, string> = {};
        for (const k of ["treatment", "cutting"])
          if (!v(k)) next[k] = t.deposit.missing;
          else if (!HTTPS.test(v(k))) next[k] = t.deposit.url;
        if (v("moodboard") && !HTTPS.test(v("moodboard")))
          next.moodboard = t.deposit.url;
        setErrors(next);
        const first = Object.keys(next)[0];
        if (first) {
          form.querySelector<HTMLInputElement>(`[name="${first}"]`)?.focus();
          return;
        }
        const values = {
          treatment: v("treatment"),
          moodboard: v("moodboard"),
          cutting: v("cutting"),
          note: v("note"),
        };
        if (place.kind === "app")
          app.run(() =>
            depositProposal({
              projectId: place.projectId,
              sheetId: place.sheetId,
              number,
              ...values,
            }),
          );
        else
          link.run(
            () => depositProposalByLink({ token: place.token, ...values }),
            `${t.deposit.done(number)}.`,
            () => form.reset(),
          );
      }}
    >
      <h3 className="font-semibold">{t.deposit.title(number)}</h3>
      {asked && (
        <p className="text-[color:var(--text-secondary)]">
          {t.deposit.asked(asked)}
        </p>
      )}
      <Field
        name="treatment"
        type="url"
        inputMode="url"
        label={t.piece.treatment}
        hint={t.deposit.hint}
        aria-required
        maxLength={2000}
        error={errors.treatment}
      />
      <Field
        name="moodboard"
        type="url"
        inputMode="url"
        label={t.piece.moodboard}
        hint={t.deposit.hint}
        maxLength={2000}
        error={errors.moodboard}
      />
      <Field
        name="cutting"
        type="url"
        inputMode="url"
        label={t.piece.cutting}
        hint={t.deposit.hint}
        aria-required
        maxLength={2000}
        error={errors.cutting}
      />
      <TextareaField
        name="note"
        label={t.deposit.note}
        rows={2}
        maxLength={2000}
      />
      {Object.keys(errors).length > 0 && (
        <FormMessage kind="error">{t.deposit.missing}</FormMessage>
      )}
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div>
        <Button
          type="submit"
          disabled={pending}
          aria-busy={pending || undefined}
        >
          {t.deposit.submit(number)}
        </Button>
      </div>
    </form>
  );
}
