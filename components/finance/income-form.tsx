"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { PersonPickerField } from "@/components/network/person-picker-field";
import { usePickerLoad } from "@/components/network/use-picker-load";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { InvoiceSection } from "@/components/finance/invoice-section";
import { TargetSelect } from "@/components/finance/target-select";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import {
  htCents,
  INCOME_KINDS,
  isIncomeKind,
  VAT_RATES,
  type Income,
  type IncomeKind,
} from "@/lib/finance/money-in";
import { saveIncome } from "@/lib/finance/treasury-actions";
import type { FinanceTarget } from "@/lib/finance/treasury-queries";
import { uploadFinanceFile } from "@/lib/finance/upload-file";
import { clientInvoices } from "@/lib/i18n/fr/client-invoices";
import { treasury } from "@/lib/i18n/fr/treasury";
import { todayInParis } from "@/lib/insights/dates";
import { listNetworkForRole } from "@/lib/network/role-people-actions";
import { parseEurosToCents } from "@/lib/projects/schemas";
import { amountInput, formatAmount } from "@/lib/utils/money";

const fr = { clientInvoices, treasury };

export type IncomePrefill = {
  label: string;
  kind: IncomeKind;
  cents: number;
  projectId: string | null;
  artistId: string | null;
  expectedOn: string;
  sourceLineId: string;
};

// Who usually pays the label: listed first, the rest of the Réseau after.
const PAYER_ROLES = [
  "company",
  "label",
  "distributor",
  "media",
  "agency",
  "other",
];

const positive = (value: string) => {
  const cents = parseEurosToCents(value);
  return cents !== null && cents !== undefined && cents > 0;
};

/**
 * An income (« Nouvelle recette ») or its change: what, how much (TTC, its VAT
 * giving the HT), from whom, for which project, artist or deal, on which
 * day, who follows it; then its invoice, when there is one: number, days,
 * sent, PDF. What the income already says is filled in.
 */
export function IncomeForm({
  income,
  targets,
  organizationId,
  ownerId,
  prefill,
  atInvoice = false,
  onDone,
}: {
  income: Income | null;
  // « Saisir la facture »: opened at its invoice number.
  atInvoice?: boolean;
  // A new income already filled: the rebilling of a spend (lot 3).
  prefill?: IncomePrefill;
  targets: FinanceTarget[];
  organizationId: string;
  // The person entering it: the owner of a new income by default.
  ownerId: string | null;
  onDone: () => void;
}) {
  const t = fr.treasury.incomeForm;
  const f = fr.clientInvoices.fields;
  const root = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!atInvoice) return;
    const field = root.current?.querySelector<HTMLElement>(
      'input[name="income-invoice-number"]',
    );
    field?.scrollIntoView({ block: "center" });
    field?.focus();
  }, [atInvoice]);
  const submit = useWriteSubmit(onDone, "");
  const loadPayers = usePickerLoad(() => listNetworkForRole(PAYER_ROLES));
  const [label, setLabel] = useState(income?.label ?? prefill?.label ?? "");
  const [kind, setKind] = useState<IncomeKind>(
    income?.kind ?? prefill?.kind ?? "service",
  );
  const [amount, setAmount] = useState(
    income
      ? amountInput(income.cents)
      : prefill
        ? amountInput(prefill.cents)
        : "",
  );
  const [contactId, setContactId] = useState(income?.contactId ?? "");
  const [payerName, setPayerName] = useState(income?.payer ?? "");
  const [projectId, setProjectId] = useState(
    income?.projectId ?? prefill?.projectId ?? "",
  );
  const [artistId, setArtistId] = useState(
    income?.artistId ?? prefill?.artistId ?? "",
  );
  const [dealId, setDealId] = useState(income?.dealId ?? "");
  const [owner, setOwner] = useState(
    income ? (income.ownerId ?? "") : (ownerId ?? ""),
  );
  const [vat, setVat] = useState(
    income ? (income.vatBp === null ? "" : String(income.vatBp)) : "2000",
  );
  const [sentOn, setSentOn] = useState(income?.sentOn ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [keptFile, setKeptFile] = useState(income?.file ?? null);
  const [expectedOn, setExpectedOn] = useState(
    income?.expectedOn ?? prefill?.expectedOn ?? todayInParis(),
  );
  const [invoiceNumber, setInvoiceNumber] = useState(
    income?.invoiceNumber ?? "",
  );
  const [invoicedOn, setInvoicedOn] = useState(income?.invoicedOn ?? "");
  const [dueOn, setDueOn] = useState(income?.dueOn ?? "");
  const [note, setNote] = useState(income?.note ?? "");
  const [tried, setTried] = useState(false);

  const errors = {
    label: label.trim() ? undefined : t.errors.label,
    amount: positive(amount) ? undefined : t.errors.amount,
    expectedOn: expectedOn ? undefined : t.errors.expectedOn,
    invoicedOn:
      invoiceNumber.trim() && !invoicedOn ? t.errors.invoicedOn : undefined,
    invoiceNumber:
      invoicedOn && !invoiceNumber.trim() ? t.errors.invoiceNumber : undefined,
    dueOn:
      dueOn && invoicedOn && dueOn < invoicedOn ? t.errors.dueOn : undefined,
    sentOn:
      sentOn && (!invoicedOn || sentOn < invoicedOn)
        ? t.errors.sentOn
        : undefined,
  };
  const missing = Object.values(errors).filter(Boolean).length;
  const vatBp = vat === "" ? null : Number(vat);
  const typed = parseEurosToCents(amount);
  const ht =
    typed && typed > 0 && vatBp ? htCents({ cents: typed, vatBp }) : null;

  function send(event: FormEvent<HTMLFormElement>) {
    // A contact added from the picker submits its own form (a modal),
    // which bubbles here through the portal: not this form's submit.
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    setTried(true);
    if (missing > 0) {
      requestAnimationFrame(() =>
        root.current
          ?.querySelector<HTMLElement>('[aria-invalid="true"]')
          ?.focus(),
      );
      return;
    }
    submit.run(async () => {
      const stored = file
        ? await uploadFinanceFile(organizationId, file)
        : null;
      if (stored && !stored.ok) return stored;
      return saveIncome({
        id: income?.id,
        sourceLineId: income ? undefined : (prefill?.sourceLineId ?? undefined),
        label,
        kind,
        amount,
        vatBp,
        contactId,
        payerName,
        projectId,
        artistId,
        dealId,
        ownerId: owner,
        expectedOn,
        invoiceNumber,
        invoicedOn,
        dueOn,
        sentOn,
        file: stored
          ? { path: stored.path, name: stored.name }
          : keptFile
            ? undefined
            : null,
        note,
      });
    });
  }

  const shown = (key: keyof typeof errors) => (tried ? errors[key] : undefined);

  return (
    <form ref={root} noValidate onSubmit={send} className="flex flex-col gap-5">
      <Field
        name="income-label"
        label={t.label}
        required
        maxLength={200}
        autoComplete="off"
        value={label}
        error={shown("label")}
        onChange={(e) => setLabel(e.target.value)}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          name="income-amount"
          label={t.amount}
          suffix="€"
          required
          inputMode="decimal"
          autoComplete="off"
          hint={ht !== null ? f.ht(formatAmount(ht, { ht: false })) : undefined}
          value={amount}
          error={shown("amount")}
          onChange={(e) => setAmount(e.target.value)}
        />
        <div className="grid gap-1.5">
          <Label htmlFor="income-vat">{f.vat}</Label>
          <SearchSelect
            id="income-vat"
            label={f.vat}
            options={{
              ...Object.fromEntries(
                VAT_RATES.map((bp) => [String(bp), f.vatRate(bp)]),
              ),
              "": f.vatUnknown,
            }}
            value={vat}
            onChange={setVat}
            searchPlaceholder={t.search}
            emptyLabel={t.noMatch}
            fill
          />
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="income-kind">{t.kind}</Label>
          <SearchSelect
            id="income-kind"
            label={t.kind}
            options={Object.fromEntries(
              INCOME_KINDS.map((k) => [k, fr.treasury.kinds[k]]),
            )}
            value={kind}
            onChange={(value) => isIncomeKind(value) && setKind(value)}
            searchPlaceholder={t.search}
            emptyLabel={t.noMatch}
            fill
          />
        </div>
        <Field
          name="income-expected-on"
          type="date"
          label={t.expectedOn}
          required
          value={expectedOn}
          error={shown("expectedOn")}
          onChange={(e) => setExpectedOn(e.target.value)}
        />
      </div>
      <PersonPickerField
        refName="contactId"
        nameName="payerName"
        legend={t.payer}
        load={loadPayers}
        defaultRef={income?.contactId ?? null}
        defaultName={income && !income.contactId ? income.payer : null}
        createRoles={["company"]}
        createKind="organization"
        refOfContact={(id) => id}
        onPick={(option, name) => {
          setContactId(option?.id ?? "");
          setPayerName(name);
        }}
      />
      <div className="grid gap-5 sm:grid-cols-3">
        <TargetSelect
          id="income-project"
          label={t.project}
          kind="project"
          targets={targets}
          value={projectId}
          onChange={setProjectId}
        />
        <TargetSelect
          id="income-artist"
          label={t.artist}
          kind="artist"
          targets={targets}
          value={artistId}
          onChange={setArtistId}
        />
        <TargetSelect
          id="income-deal"
          label={f.deal}
          kind="deal"
          targets={targets}
          value={dealId}
          onChange={setDealId}
        />
      </div>
      <TargetSelect
        id="income-owner"
        label={f.owner}
        hint={f.ownerHint}
        kind="member"
        targets={targets}
        value={owner}
        onChange={setOwner}
      />
      <InvoiceSection
        value={{ invoiceNumber, invoicedOn, dueOn, sentOn }}
        errors={{
          invoiceNumber: shown("invoiceNumber"),
          invoicedOn: shown("invoicedOn"),
          dueOn: shown("dueOn"),
          sentOn: shown("sentOn"),
        }}
        onChange={(patch) => {
          if (patch.invoiceNumber !== undefined)
            setInvoiceNumber(patch.invoiceNumber);
          if (patch.invoicedOn !== undefined) setInvoicedOn(patch.invoicedOn);
          if (patch.dueOn !== undefined) setDueOn(patch.dueOn);
          if (patch.sentOn !== undefined) setSentOn(patch.sentOn);
        }}
        keptFile={keptFile}
        file={file}
        onFile={setFile}
        onRemoveKept={() => setKeptFile(null)}
      />
      <TextareaField
        name="income-note"
        label={t.note}
        maxLength={1000}
        rows={2}
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      {tried && missing > 0 && (
        <FormMessage kind="error">{t.errors.missing(missing)}</FormMessage>
      )}
      {submit.error && <FormMessage kind="error">{submit.error}</FormMessage>}
      <DialogFormActions
        pending={submit.pending}
        submitLabel={t.save}
        pendingLabel={t.saving}
        onCancel={onDone}
      />
    </form>
  );
}
