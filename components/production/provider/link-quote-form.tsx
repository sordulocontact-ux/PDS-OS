"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { fr } from "@/lib/i18n/fr";
import { depositQuoteByLink } from "@/lib/production/provider/journey-actions";

import { useLinkSubmit } from "./use-link-submit";

const t = fr.productionLink.quote;
const e = fr.productionQuotes.errors;

/** « Déposer le devis Vn » (proto quoteDeposit, on the company's link):
 * the total, the PDF, the amount planned for the places (compared later to
 * the place retained), a note for PDS. */
export function LinkQuoteForm({
  token,
  number,
  locHint,
  revision,
}: {
  token: string;
  number: number;
  locHint: string;
  revision: string | null;
}) {
  const { pending, error, run } = useLinkSubmit();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const euros = (v: string) =>
    Number(v.replace(/[\s  €]/g, "").replace(",", "."));
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        const v = (k: string) => String(data.get(k) ?? "").trim();
        const next: Record<string, string> = {};
        if (!(euros(v("amount")) > 0)) next.amount = e.amount;
        if (v("loc") === "" || Number.isNaN(euros(v("loc")))) next.loc = e.loc;
        else if (euros(v("loc")) > euros(v("amount"))) next.loc = e.locOver;
        if (!/^https:\/\/\S+$/.test(v("url"))) next.url = e.url;
        setErrors(next);
        if (Object.keys(next).length > 0) return;
        run(
          () =>
            depositQuoteByLink({
              token,
              label: "",
              amount: v("amount"),
              loc: v("loc"),
              deliveryOn: "",
              url: v("url"),
              note: v("note"),
            }),
          fr.productionLink.quote.done,
          () => form.reset(),
        );
      }}
    >
      <h3 className="font-semibold">{t.depositV(number)}</h3>
      {revision && (
        <p className="text-[color:var(--text-secondary)]">
          {t.revision(revision)}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          name="amount"
          label={t.amount}
          required
          inputMode="decimal"
          suffix="€"
          error={errors.amount}
        />
        <Field
          name="url"
          label={t.file}
          hint={t.fileHint}
          required
          type="url"
          inputMode="url"
          placeholder="https://"
          error={errors.url}
        />
        <Field
          name="loc"
          label={t.loc}
          hint={locHint}
          required
          inputMode="decimal"
          suffix="€"
          error={errors.loc}
        />
      </div>
      <TextareaField name="note" label={t.note} rows={2} maxLength={1000} />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div>
        <Button
          type="submit"
          disabled={pending}
          aria-busy={pending || undefined}
        >
          {t.depositV(number)}
        </Button>
      </div>
    </form>
  );
}
