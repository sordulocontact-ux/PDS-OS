"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { FilePickField } from "@/components/ui/file-pick-field";
import { invoices } from "@/lib/i18n/fr/invoices";
import { todayInParis } from "@/lib/insights/dates";
import {
  addReceivedInvoice,
  openTeamInvoiceSlot,
} from "@/lib/invoices/actions";
import {
  openPersonInvoiceSlot,
  submitPersonInvoice,
} from "@/lib/invoices/public-actions";
import { invoiceDueOn } from "@/lib/invoices/rules";
import { createClient } from "@/lib/supabase/client";
import { formatDay } from "@/lib/utils/day";
import { amountInput } from "@/lib/utils/money";

import { checkInvoice, type InvoiceDraft } from "./invoice-check";
import { InvoiceRibFields } from "./invoice-rib-fields";

const fr = { invoices };

const t = fr.invoices;

export type InvoiceTarget =
  | { kind: "link"; token: string; invoiceId: string }
  | { kind: "team"; invoiceId: string; projectId: string };

/**
 * An invoice to deposit (proto `invoiceFields`, `invPortal`): on the
 * person's private link (« Envoyer ma facture ») or added by the team
 * (« Ajouter la facture », with the day it arrived).
 * The PDF waits until the form is sent; every missing field turns red with
 * its reason at the first try, the first one focused.
 */
export function InvoiceForm({
  target,
  expectedCents,
  rib,
  holder,
}: {
  target: InvoiceTarget;
  expectedCents: number | null;
  // The RIB on file as this reader may see it (masked on the link, its
  // state for the team); null: none yet.
  rib: { value: string; source: string } | null;
  // Pre-filled « Titulaire du compte »: the person's name.
  holder: string;
}) {
  const root = useRef<HTMLFormElement>(null);
  const link = target.kind === "link";
  const [draft, setDraft] = useState<InvoiceDraft>({
    file: null,
    number: "",
    amount: expectedCents ? amountInput(expectedCents) : "",
    why: "",
    receivedOn: link ? null : todayInParis(),
    ribOpen: rib === null,
    iban: "",
    bic: "",
    holder,
  });
  const [tried, setTried] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = (patch: Partial<InvoiceDraft>) =>
    setDraft((d) => ({ ...d, ...patch }));
  const check = checkInvoice(draft, expectedCents);
  const shown = tried ? check.errors : {};
  const missing = Object.keys(check.errors).length;

  function send() {
    setTried(true);
    if (missing > 0 || !draft.file || check.amountCents === null) {
      requestAnimationFrame(() =>
        root.current
          ?.querySelector<HTMLElement>(
            '[aria-invalid="true"], input[type=file]',
          )
          ?.focus(),
      );
      return;
    }
    const file = draft.file;
    const amountCents = check.amountCents;
    setError(null);
    start(async () => {
      const slot = link
        ? await openPersonInvoiceSlot(target.token, target.invoiceId)
        : await openTeamInvoiceSlot(target.invoiceId);
      if (!slot.ok) return setError(slot.error);
      const { error: upload } = await createClient()
        .storage.from("project-invoices")
        .upload(slot.path, file, {
          contentType: "application/pdf",
          upsert: false,
        });
      if (upload) return setError(t.errors.upload_missing);
      const values = {
        path: slot.path,
        fileName: file.name,
        number: draft.number,
        amountCents,
        reason: check.mismatch ? draft.why : null,
        iban: draft.ribOpen ? draft.iban : null,
        bic: draft.ribOpen ? draft.bic : null,
        holder: draft.ribOpen ? draft.holder : null,
      };
      const result = link
        ? await submitPersonInvoice(target.token, target.invoiceId, values)
        : await addReceivedInvoice(target.projectId, target.invoiceId, {
            ...values,
            receivedOn: draft.receivedOn ?? todayInParis(),
          });
      if (!result.ok) return setError(result.error);
      if (link)
        toast.success(t.portal.sent, {
          description: t.portal.sentLine(
            formatDay(invoiceDueOn()),
            draft.ribOpen && rib !== null,
          ),
        });
      else toast.success(t.team.added);
    });
  }

  return (
    <form
      ref={root}
      noValidate
      className="flex flex-col gap-4"
      aria-busy={pending || undefined}
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
    >
      <FilePickField
        id={`invoice-pdf-${target.invoiceId}`}
        label={`${t.fields.pdf} *`}
        hint={t.fields.pdfHint}
        chosenLabel={t.fields.chosen}
        file={draft.file}
        error={shown.file}
        onFile={(file) => set({ file })}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          name={`number-${target.invoiceId}`}
          label={t.fields.number}
          aria-required
          placeholder={t.fields.numberPlaceholder}
          value={draft.number}
          error={shown.number}
          onChange={(e) => set({ number: e.target.value })}
        />
        <Field
          name={`amount-${target.invoiceId}`}
          label={t.fields.amount}
          aria-required
          inputMode="decimal"
          suffix="€"
          value={draft.amount}
          hint={expectedCents ? t.fields.amountHint : undefined}
          error={shown.amount}
          onChange={(e) => set({ amount: e.target.value })}
        />
      </div>
      {draft.receivedOn !== null && (
        <div className="max-w-60">
          <Field
            name={`received-on-${target.invoiceId}`}
            type="date"
            label={t.fields.receivedOn}
            aria-required
            max={todayInParis()}
            value={draft.receivedOn}
            error={shown.receivedOn}
            onChange={(e) => set({ receivedOn: e.target.value })}
          />
        </div>
      )}
      {check.mismatch && (
        <TextareaField
          name={`why-${target.invoiceId}`}
          label={t.fields.why}
          aria-required
          rows={2}
          maxLength={1000}
          placeholder={t.fields.whyPlaceholder}
          value={draft.why}
          error={shown.why}
          onChange={(e) => set({ why: e.target.value })}
        />
      )}
      {rib && !draft.ribOpen ? (
        <FactRows>
          <FactRow
            label={link ? t.portal.rib : t.fields.ribOf(holder)}
            value={rib.value}
            source={rib.source}
            side={
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => set({ ribOpen: true })}
              >
                {t.portal.ribChange}
              </Button>
            }
          />
        </FactRows>
      ) : (
        <InvoiceRibFields
          id={target.invoiceId}
          title={
            link
              ? rib
                ? t.portal.newRib
                : t.portal.rib
              : t.fields.ribOf(holder)
          }
          note={rib || !link ? t.fields.ribNew : t.fields.ribFirstLink}
          draft={draft}
          errors={shown}
          onChange={set}
        />
      )}
      {tried && missing > 0 && (
        <FormMessage kind="error">{t.fields.missingCount(missing)}</FormMessage>
      )}
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <Button
        type="submit"
        variant={link ? "default" : "outline"}
        className="self-start"
        disabled={pending}
      >
        {link ? t.portal.send : t.team.add}
      </Button>
    </form>
  );
}
