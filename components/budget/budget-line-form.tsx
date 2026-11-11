"use client";

import { useRef, useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import {
  BudgetClassificationFields,
  NONE,
  type Classification,
} from "@/components/budget/budget-classification-fields";
import { BudgetProofField } from "@/components/budget/budget-proof-field";
import { OptionSelect } from "@/components/framing/option-select";
import { Label } from "@/components/ui/label";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { saveBudgetLine } from "@/lib/budget/actions";
import {
  centsToInput,
  isBudgetStatus,
  type BudgetDeliverable,
  type BudgetFamily,
  type BudgetLever,
  type BudgetLine,
  type BudgetStatus,
  type BudgetTarget,
} from "@/lib/budget/types";
import { uploadBudgetProof } from "@/lib/budget/upload-proof";
import { budget } from "@/lib/i18n/fr/budget";
import { todayInParis } from "@/lib/insights/dates";
import { parseEurosToCents } from "@/lib/projects/schemas";

const fr = { budget };

/** What a new line starts with: a draft of PO, a quick entry (« déjà
 * payée »). Every value optional. */
export type BudgetLineInitial = Partial<{
  label: string;
  amount: string;
  status: BudgetStatus | null;
  family: BudgetFamily | null;
  note: string;
  spentOn: string;
}>;

/**
 * The one form of a spend, on a project or an artist (BUD 1): the proof
 * first (a photo, never required), the amount, what it is, its poste
 * (suggested from the label, MKT-S1-15), its state and its day, then the
 * lever and deliverable of a project. `initial`: a new line already filled
 * (PO, quick entry). `onCancel`: when cancelling is not just closing (PO's
 * panel). Missing fields turn red at the first try only (CLAUDE.md,
 * « Formulaires »).
 */
export function BudgetLineForm({
  target,
  line,
  initial,
  levers = [],
  deliverables = [],
  organizationId = null,
  onDone,
  onCancel = onDone,
}: {
  target: BudgetTarget;
  line: BudgetLine | null;
  initial?: BudgetLineInitial;
  levers?: BudgetLever[];
  deliverables?: BudgetDeliverable[];
  // Where a proof is uploaded; no proof field without it.
  organizationId?: string | null;
  onDone: () => void;
  onCancel?: () => void;
}) {
  const t = fr.budget.form;
  const root = useRef<HTMLFormElement>(null);
  const submit = useWriteSubmit(onDone, t.saved);
  const [v, setV] = useState({
    label: line?.label ?? initial?.label ?? "",
    amount: line ? centsToInput(line.amountCents) : (initial?.amount ?? ""),
    status: line?.status ?? initial?.status ?? "planned",
    spentOn: line?.spentOn ?? initial?.spentOn ?? todayInParis(),
    note: line?.note ?? initial?.note ?? "",
  });
  const [classification, setClassification] = useState<Classification>({
    family: line?.family ?? initial?.family ?? NONE,
    familyDetail: line?.familyDetail ?? "",
    leverId: line?.leverId ?? NONE,
    deliverableId: line?.deliverableId ?? NONE,
  });
  const [proof, setProof] = useState<File | null>(null);
  const [tried, setTried] = useState(false);
  const none = (value: string) => (value === NONE ? "" : value);
  // A line that follows an invoice: its amount and state are the invoice's.
  const followsInvoice = Boolean(line?.invoiceId);
  const onProject = target.kind === "project";

  const amountCents = parseEurosToCents(v.amount);
  const errors = {
    amount:
      amountCents === null || amountCents === undefined
        ? t.invalidAmount
        : undefined,
    label: v.label.trim() ? undefined : t.labelMissing,
    detail:
      classification.family === "other" && !classification.familyDetail.trim()
        ? t.familyDetailRequired
        : undefined,
    spentOn: v.spentOn ? undefined : t.spentOnMissing,
  };
  const missing = Object.values(errors).filter(Boolean).length;
  const shown: Partial<typeof errors> = tried ? errors : {};

  function send(event: React.FormEvent<HTMLFormElement>) {
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
      // The proof first: the line keeps the file it was saved with.
      let attachmentFileId = "";
      if (proof && organizationId) {
        const uploaded = await uploadBudgetProof({
          organizationId,
          target,
          description: t.attachmentOf(v.label),
          file: proof,
        });
        if (!uploaded.ok) return { ok: false, error: t.attachmentFailed };
        attachmentFileId = uploaded.id;
      }
      return saveBudgetLine(target, {
        id: line?.id,
        label: v.label,
        amount: v.amount,
        status: v.status,
        spentOn: v.spentOn,
        family: none(classification.family),
        familyDetail: classification.familyDetail,
        leverId: onProject ? none(classification.leverId) : "",
        deliverableId: onProject ? none(classification.deliverableId) : "",
        attachmentFileId,
        note: v.note,
      });
    });
  }

  return (
    <form ref={root} noValidate onSubmit={send} className="flex flex-col gap-5">
      {organizationId && (
        <BudgetProofField
          target={target}
          line={line}
          file={proof}
          onFile={setProof}
        />
      )}
      <Field
        name="amount"
        label={t.amount}
        aria-required
        inputMode="decimal"
        autoComplete="off"
        readOnly={followsInvoice}
        value={v.amount}
        error={shown.amount}
        hint={followsInvoice ? t.followsInvoice : t.amountHint}
        onChange={(e) => setV({ ...v, amount: e.target.value })}
      />
      <Field
        name="label"
        label={t.label}
        aria-required
        maxLength={200}
        value={v.label}
        error={shown.label}
        onChange={(e) => setV({ ...v, label: e.target.value })}
      />
      <BudgetClassificationFields
        label={v.label}
        value={classification}
        onChange={setClassification}
        levers={onProject ? levers : []}
        deliverables={onProject ? deliverables : []}
        detailError={Boolean(shown.detail)}
        afterFamily={
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="grid content-start gap-1.5">
              <Label htmlFor="budget-status" required>
                {t.status}
              </Label>
              <OptionSelect
                id="budget-status"
                required
                fill
                label={t.status}
                options={fr.budget.statuses}
                disabled={followsInvoice}
                value={v.status}
                onChange={(s) => isBudgetStatus(s) && setV({ ...v, status: s })}
              />
            </div>
            <Field
              name="spent-on"
              type="date"
              label={t.spentOn}
              aria-required
              value={v.spentOn}
              error={shown.spentOn}
              onChange={(e) => setV({ ...v, spentOn: e.target.value })}
            />
          </div>
        }
      />
      <TextareaField
        name="note"
        label={t.note}
        maxLength={1000}
        value={v.note}
        onChange={(e) => setV({ ...v, note: e.target.value })}
      />
      {tried && missing > 0 && (
        <FormMessage kind="error">{t.missingCount(missing)}</FormMessage>
      )}
      {submit.error && <FormMessage kind="error">{submit.error}</FormMessage>}
      <DialogFormActions
        pending={submit.pending}
        submitLabel={t.save}
        pendingLabel={t.saving}
        onCancel={onCancel}
      />
    </form>
  );
}
