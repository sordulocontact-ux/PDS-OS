"use client";

import { useState } from "react";
import { toast } from "sonner";

import {
  BudgetClassificationFields,
  NONE,
  type Classification,
} from "@/components/budget/budget-classification-fields";
import { OptionSelect } from "@/components/framing/option-select";
import { useFramingAction } from "@/components/framing/use-framing-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FilePickField } from "@/components/ui/file-pick-field";
import { Textarea } from "@/components/ui/textarea";
import { saveBudgetLine } from "@/lib/budget/actions";
import {
  centsToInput,
  isBudgetStatus,
  type BudgetDeliverable,
  type BudgetFamily,
  type BudgetLever,
  type BudgetLine,
  type BudgetStatus,
} from "@/lib/budget/types";
import { uploadCatalogFile } from "@/lib/catalog/upload-file";
import { fr } from "@/lib/i18n/fr";

/**
 * A line's fields. `initial`: a new line already filled (a draft of PO).
 * `onCancel`: when cancelling is not just closing (PO's panel). Label,
 * amount and status are all that is required; the classification is
 * assisted (MKT-S1-15); a proof is stored once, in the project's library,
 * when the writer's organization is known.
 */
export function BudgetLineForm({
  projectId,
  line,
  initial,
  levers,
  deliverables = [],
  organizationId = null,
  onDone,
  onCancel = onDone,
}: {
  projectId: string;
  line: BudgetLine | null;
  initial?: {
    label: string;
    amount: string;
    status: BudgetStatus | null;
    family: BudgetFamily | null;
    note: string;
  };
  levers: BudgetLever[];
  deliverables?: BudgetDeliverable[];
  // Where a proof is uploaded; no proof field without it.
  organizationId?: string | null;
  onDone: () => void;
  onCancel?: () => void;
}) {
  const t = fr.budget.form;
  const { pending, run } = useFramingAction();
  const [status, setStatus] = useState<BudgetStatus>(
    line?.status ?? initial?.status ?? "planned",
  );
  const [label, setLabel] = useState(line?.label ?? initial?.label ?? "");
  const [classification, setClassification] = useState<Classification>({
    family: line?.family ?? initial?.family ?? NONE,
    familyDetail: line?.familyDetail ?? "",
    leverId: line?.leverId ?? NONE,
    deliverableId: line?.deliverableId ?? NONE,
  });
  const [proof, setProof] = useState<File | null>(null);
  const [amountError, setAmountError] = useState(false);
  const [detailError, setDetailError] = useState(false);
  const none = (value: string) => (value === NONE ? "" : value);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const amount = String(form.get("amount") ?? "");
    setAmountError(false);
    const missingDetail =
      classification.family === "other" && !classification.familyDetail.trim();
    setDetailError(missingDetail);
    if (missingDetail) return;
    run(
      async () => {
        // The proof first: the line keeps the file it was saved with.
        let attachmentFileId = "";
        if (proof && organizationId) {
          const uploaded = await uploadCatalogFile({
            organizationId,
            owner: { kind: "project", id: projectId },
            category: "other",
            description: t.attachmentOf(label),
            file: proof,
          });
          if (uploaded.ok) attachmentFileId = uploaded.id;
          else toast.error(t.attachmentFailed);
        }
        const result = await saveBudgetLine(projectId, {
          id: line?.id,
          label,
          amount,
          status,
          family: none(classification.family),
          familyDetail: classification.familyDetail,
          leverId: none(classification.leverId),
          deliverableId: none(classification.deliverableId),
          attachmentFileId,
          note: String(form.get("note") ?? ""),
        });
        if (!result.ok && result.error === "invalid_input")
          setAmountError(true);
        return result;
      },
      () => {
        toast.success(t.saved);
        onDone();
      },
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div className="grid gap-1.5">
        <Label htmlFor="budget-label" required>
          {t.label}
        </Label>
        <Input
          id="budget-label"
          name="label"
          required
          maxLength={200}
          value={label}
          onChange={(event) => setLabel(event.target.value)}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="budget-amount" required>
          {t.amount}
        </Label>
        <Input
          id="budget-amount"
          name="amount"
          required
          inputMode="decimal"
          autoComplete="off"
          aria-invalid={amountError || undefined}
          aria-describedby="budget-amount-hint"
          defaultValue={
            line ? centsToInput(line.amountCents) : (initial?.amount ?? "")
          }
        />
        <p
          id="budget-amount-hint"
          className={
            amountError
              ? "text-caption text-error"
              : "text-caption text-muted-foreground"
          }
        >
          {amountError ? t.invalidAmount : t.amountHint}
        </p>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="budget-status" required>
          {t.status}
        </Label>
        <OptionSelect
          id="budget-status"
          required
          label={t.status}
          options={fr.budget.statuses}
          value={status}
          onChange={(v) => isBudgetStatus(v) && setStatus(v)}
        />
      </div>
      <BudgetClassificationFields
        label={label}
        value={classification}
        onChange={setClassification}
        levers={levers}
        deliverables={deliverables}
        detailError={detailError}
      />
      {organizationId && (
        <FilePickField
          id="budget-proof"
          label={t.attachment}
          hint={t.attachmentHint}
          chosenLabel={(name) => t.attachmentKept(name)}
          file={proof}
          onFile={setProof}
        />
      )}
      {!proof && line?.attachment && (
        <p className="text-sm text-[color:var(--text-secondary)]">
          {line.attachment.url ? (
            <a
              href={line.attachment.url}
              className="underline underline-offset-4"
            >
              {t.attachmentKept(line.attachment.name)}
            </a>
          ) : (
            t.attachmentKept(line.attachment.name)
          )}
        </p>
      )}
      <div className="grid gap-1.5">
        <Label htmlFor="budget-note">{t.note}</Label>
        <Textarea
          id="budget-note"
          name="note"
          maxLength={1000}
          defaultValue={line?.note ?? initial?.note ?? ""}
        />
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" size="lg" onClick={onCancel}>
          {t.cancel}
        </Button>
        <Button
          type="submit"
          size="lg"
          disabled={pending}
          aria-busy={pending || undefined}
        >
          {pending ? t.saving : t.save}
        </Button>
      </div>
    </form>
  );
}
