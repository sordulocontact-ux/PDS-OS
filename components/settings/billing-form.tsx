"use client";

import { useRef, useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { invoices } from "@/lib/i18n/fr/invoices";
import type { Billing } from "@/lib/invoices/billing";
import { saveBilling } from "@/lib/invoices/billing-actions";

const fr = { invoices };

const t = fr.invoices.billing;

/** « Facturation de PDS »: what an invoice is addressed to. */
export function BillingForm({ initial }: { initial: Billing | null }) {
  const root = useRef<HTMLFormElement>(null);
  const [v, setV] = useState({
    legalName: initial?.legalName ?? "",
    address: initial?.address ?? "",
    siret: initial?.siret ?? "",
    vat: initial?.vat ?? "",
  });
  const [tried, setTried] = useState(false);
  const submit = useWriteSubmit(() => setTried(false), t.saved);
  const errors = {
    legalName: v.legalName.trim() ? undefined : t.legalNameMissing,
    address: v.address.trim() ? undefined : t.addressMissing,
    siret:
      !v.siret.trim() || /^\d{14}$/.test(v.siret.replace(/\s/g, ""))
        ? undefined
        : t.siretInvalid,
  };
  const missing = Object.values(errors).filter(Boolean).length;
  const shown: Partial<typeof errors> = tried ? errors : {};
  return (
    <form
      ref={root}
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        setTried(true);
        if (missing > 0) {
          requestAnimationFrame(() =>
            root.current
              ?.querySelector<HTMLElement>('[aria-invalid="true"]')
              ?.focus(),
          );
          return;
        }
        submit.run(() => saveBilling(v));
      }}
    >
      <Field
        name="legal-name"
        label={t.legalName}
        aria-required
        value={v.legalName}
        error={shown.legalName}
        onChange={(e) => setV({ ...v, legalName: e.target.value })}
      />
      <TextareaField
        name="address"
        label={t.address}
        aria-required
        rows={2}
        maxLength={500}
        value={v.address}
        error={shown.address}
        onChange={(e) => setV({ ...v, address: e.target.value })}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          name="siret"
          label={t.siret}
          inputMode="numeric"
          value={v.siret}
          error={shown.siret}
          onChange={(e) => setV({ ...v, siret: e.target.value })}
        />
        <Field
          name="vat"
          label={t.vat}
          value={v.vat}
          onChange={(e) => setV({ ...v, vat: e.target.value })}
        />
      </div>
      {tried && missing > 0 && (
        <FormMessage kind="error">
          {fr.invoices.fields.missingCount(missing)}
        </FormMessage>
      )}
      {submit.error && <FormMessage kind="error">{submit.error}</FormMessage>}
      <Button type="submit" className="self-start" disabled={submit.pending}>
        {t.save}
      </Button>
    </form>
  );
}
