"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { DialogButton } from "@/components/ui/dialog-button";
import { FilePickField } from "@/components/ui/file-pick-field";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { uploadActivationFile } from "@/lib/activations/files/upload";
import type { InfluenceData } from "@/lib/activations/influence/queries";
import {
  advancePayment,
  savePayment,
} from "@/lib/activations/influence/payment-actions";
import type { ActivationScope } from "@/lib/activations/types";
import { fr } from "@/lib/i18n/fr";

const t = fr.activationInfluence.payment;
type Payment = InfluenceData["payments"][number];
const STATUSES = Object.keys(t.statuses) as (keyof typeof t.statuses)[];

function PaymentForm({
  scope,
  targetId,
  payment,
  onDone,
}: {
  scope: ActivationScope;
  targetId: string;
  payment: Payment | null;
  onDone: () => void;
}) {
  const [invoice, setInvoice] = useState<File | null>(null);
  const [amountError, setAmountError] = useState(false);
  const { pending, error, run } = useWriteSubmit(onDone, t.saved);
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const amount = Number(
          String(data.get("amount") ?? "")
            .replace(/\s/g, "")
            .replace(",", "."),
        );
        const bad =
          !Number.isFinite(amount) ||
          amount < 0 ||
          String(data.get("amount") ?? "").trim() === "";
        setAmountError(bad);
        if (bad) return;
        run(async () => {
          let invoiceFileId = payment?.invoice_file_id ?? null;
          if (invoice) {
            const uploaded = await uploadActivationFile({
              ...scope,
              kind: "invoice",
              file: invoice,
            });
            if (!uploaded.ok) return uploaded;
            invoiceFileId = uploaded.fileId;
          }
          return savePayment({
            projectId: scope.projectId,
            activationId: scope.activationId,
            targetId,
            paymentId: payment?.id ?? null,
            amount,
            currency: (
              String(data.get("currency") ?? "")
                .trim()
                .toUpperCase() || "EUR"
            ).slice(0, 3),
            beneficiary: String(data.get("beneficiary") ?? ""),
            documents: String(data.get("documents") ?? ""),
            invoiceFileId,
            dueOn: String(data.get("dueOn") ?? ""),
          });
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
        <Field
          name="amount"
          label={t.amount}
          required
          inputMode="decimal"
          defaultValue={payment ? String(payment.amount) : ""}
          error={
            amountError
              ? fr.activationInfluence.errors.amountInvalid
              : undefined
          }
        />
        <Field
          name="currency"
          label={t.currency}
          defaultValue={payment?.currency ?? "EUR"}
          maxLength={3}
        />
      </div>
      <Field
        name="beneficiary"
        label={t.beneficiary}
        maxLength={200}
        defaultValue={payment?.beneficiary ?? ""}
      />
      <TextareaField
        name="documents"
        label={t.documents}
        rows={2}
        maxLength={1000}
        defaultValue={payment?.documents_requested ?? ""}
      />
      <FilePickField
        id="payment-invoice"
        label={t.invoice}
        hint={fr.activations.fileHint}
        chosenLabel={fr.activations.fileChosen}
        file={invoice}
        onFile={setInvoice}
      />
      <Field
        name="dueOn"
        type="date"
        label={t.dueOn}
        defaultValue={payment?.due_on ?? ""}
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" size="lg" onClick={onDone}>
          {fr.activations.cancel}
        </Button>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? fr.activations.saving : fr.activationWork.sheet.save}
        </Button>
      </div>
    </form>
  );
}

function StatusForm({
  scope,
  payment,
  onDone,
}: {
  scope: ActivationScope;
  payment: Payment;
  onDone: () => void;
}) {
  const [status, setStatus] = useState(payment.status);
  const [proof, setProof] = useState<File | null>(null);
  const { pending, error, run } = useWriteSubmit(onDone, t.moved);
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const note = String(
          new FormData(event.currentTarget).get("note") ?? "",
        );
        run(async () => {
          let proofFileId: string | null = null;
          if (status === "paid_verified" && proof) {
            const uploaded = await uploadActivationFile({
              ...scope,
              kind: "payment_proof",
              file: proof,
            });
            if (!uploaded.ok) return uploaded;
            proofFileId = uploaded.fileId;
          }
          return advancePayment({
            projectId: scope.projectId,
            paymentId: payment.id,
            status: status as (typeof STATUSES)[number],
            note,
            proofFileId,
          });
        });
      }}
    >
      <OptionSelect
        name="status"
        label={t.status}
        required
        items={Object.fromEntries(STATUSES.map((s) => [s, t.statuses[s]]))}
        defaultValue={status}
        onValueChange={setStatus}
      />
      {status === "paid_verified" && (
        <FilePickField
          id="payment-proof"
          label={t.proof}
          hint={fr.activations.fileHint}
          chosenLabel={fr.activations.fileChosen}
          file={proof}
          onFile={setProof}
        />
      )}
      <Field
        name="note"
        label={t.statusNote}
        maxLength={1000}
        defaultValue={payment.status_note ?? ""}
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" size="lg" onClick={onDone}>
          {fr.activations.cancel}
        </Button>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? fr.activations.saving : t.move}
        </Button>
      </div>
    </form>
  );
}

export function PaymentButtons({
  scope,
  targetId,
  payment,
}: {
  scope: ActivationScope;
  targetId: string;
  payment: Payment | null;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <DialogButton
        label={payment ? t.edit : t.create}
        size="xs"
        title={t.formTitle}
        description={t.description}
      >
        {(close) => (
          <PaymentForm
            scope={scope}
            targetId={targetId}
            payment={payment}
            onDone={close}
          />
        )}
      </DialogButton>
      {payment && (
        <DialogButton
          label={t.move}
          size="xs"
          variant="default"
          title={t.moveTitle}
          description={t.moveDescription}
        >
          {(close) => (
            <StatusForm scope={scope} payment={payment} onDone={close} />
          )}
        </DialogButton>
      )}
    </div>
  );
}
