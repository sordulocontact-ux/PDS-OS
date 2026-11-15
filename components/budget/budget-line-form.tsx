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
import {
  BudgetSpendDetails,
  type SpendDetails,
} from "@/components/budget/budget-spend-details";
import { BudgetStatusDateFields } from "@/components/budget/budget-status-date-fields";
import {
  BudgetTargetField,
  targetKey,
} from "@/components/budget/budget-target-field";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { saveBudgetLine } from "@/lib/budget/actions";
import {
  centsToInput,
  isFinanceTarget,
  type BudgetDeliverable,
  type BudgetLever,
  type BudgetLine,
  type BudgetTarget,
  type ExpenseTarget,
} from "@/lib/budget/types";
import { lineFormErrors, type BudgetLineInitial } from "@/lib/budget/line-form";
import { uploadBudgetProof } from "@/lib/budget/upload-proof";
import { uploadFinanceFile } from "@/lib/finance/upload-file";
import { parseEurosToCents } from "@/lib/projects/schemas";
import { budget } from "@/lib/i18n/fr/budget";
import { todayInParis } from "@/lib/insights/dates";

const fr = { budget };

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
  target: fixedTarget,
  targets = [],
  line,
  initial,
  levers = [],
  deliverables = [],
  organizationId = null,
  storedProof,
  onDone,
  onCancel = onDone,
}: {
  // Null: chosen in the form among `targets` (a quick spend, BUD 4).
  target: BudgetTarget | null;
  targets?: ExpenseTarget[];
  line: BudgetLine | null;
  initial?: BudgetLineInitial;
  levers?: BudgetLever[];
  deliverables?: BudgetDeliverable[];
  // Where a proof is uploaded; no proof field without it.
  organizationId?: string | null;
  // A file already kept in finance-files (a proof of Finance › Justificatifs,
  // « Créer la dépense »): a Finance spend's proof when no other is chosen.
  storedProof?: { path: string; name: string };
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
    subpost: line?.subpost ?? "",
  });
  const [classification, setClassification] = useState<Classification>({
    family: line?.family ?? initial?.family ?? NONE,
    familyDetail: line?.familyDetail ?? "",
    leverId: line?.leverId ?? NONE,
    deliverableId: line?.deliverableId ?? NONE,
  });
  const [details, setDetails] = useState<SpendDetails>({
    // A new spend: 20 %, the common rate; an old one keeps « not given ».
    vat: line ? (line.vatBp === null ? "" : String(line.vatBp)) : "2000",
    supplierContactId: line?.supplierContactId ?? "",
    supplierName: line?.supplierContactId ? "" : (line?.supplierName ?? ""),
    dueOn: line?.dueOn ?? "",
    rebillable: line?.rebillable ?? false,
    validatorId: line?.validatorId ?? "",
  });
  const [proof, setProof] = useState<File | null>(null);
  const [chosen, setChosen] = useState("");
  const target =
    fixedTarget ?? targets.find((o) => targetKey(o) === chosen) ?? null;
  const [tried, setTried] = useState(false);
  const none = (value: string) => (value === NONE ? "" : value);
  // A line that follows an invoice: its amount and state are the invoice's.
  const followsInvoice = Boolean(line?.invoiceId);
  const onProject = target?.kind === "project";

  const errors = lineFormErrors({ ...v, ...classification, target });
  const missing = Object.values(errors).filter(Boolean).length;
  const shown: Partial<typeof errors> = tried ? errors : {};

  function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTried(true);
    if (missing > 0 || !target) {
      requestAnimationFrame(() =>
        root.current
          ?.querySelector<HTMLElement>('[aria-invalid="true"]')
          ?.focus(),
      );
      return;
    }
    submit.run(async () => {
      // The proof first: the line keeps the file it was saved with (a
      // Finance spend's in finance-files, the others in their library).
      let attachmentFileId = "";
      let financeProof: { path: string; name: string } | undefined =
        storedProof && isFinanceTarget(target) ? storedProof : undefined;
      if (proof && organizationId) {
        if (isFinanceTarget(target)) {
          const stored = await uploadFinanceFile(organizationId, proof);
          if (!stored.ok) return { ok: false, error: t.attachmentFailed };
          financeProof = { path: stored.path, name: stored.name };
        } else {
          const uploaded = await uploadBudgetProof({
            organizationId,
            target: {
              kind: target.kind as "project" | "artist",
              id: target.id,
            },
            description: t.attachmentOf(v.label),
            file: proof,
          });
          if (!uploaded.ok) return { ok: false, error: t.attachmentFailed };
          attachmentFileId = uploaded.id;
        }
      }
      return saveBudgetLine(target, {
        id: line?.id,
        label: v.label,
        amount: v.amount,
        status: v.status,
        spentOn: v.spentOn,
        family: none(classification.family),
        familyDetail: classification.familyDetail,
        subpost: v.subpost,
        leverId: onProject ? none(classification.leverId) : "",
        deliverableId: onProject ? none(classification.deliverableId) : "",
        attachmentFileId,
        proof: financeProof,
        vatBp: details.vat === "" ? null : Number(details.vat),
        supplierContactId: details.supplierContactId,
        supplierName: details.supplierName,
        dueOn: details.dueOn,
        rebillable: details.rebillable,
        validatorId: details.validatorId,
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
          <>
            <Field
              name="subpost"
              label={t.subpost}
              maxLength={120}
              autoComplete="off"
              value={v.subpost}
              onChange={(e) => setV({ ...v, subpost: e.target.value })}
            />
            {/* « projet ou artiste » right after the poste (BUD 4). */}
            {!fixedTarget && (
              <BudgetTargetField
                targets={targets}
                value={chosen}
                error={shown.target}
                onChange={setChosen}
              />
            )}
            <BudgetStatusDateFields
              status={v.status}
              spentOn={v.spentOn}
              spentOnError={shown.spentOn}
              statusLocked={followsInvoice}
              onStatus={(status) => setV({ ...v, status })}
              onSpentOn={(spentOn) => setV({ ...v, spentOn })}
            />
          </>
        }
      />
      <BudgetSpendDetails
        value={details}
        amountCents={parseEurosToCents(v.amount) ?? null}
        onChange={setDetails}
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
