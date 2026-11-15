"use client";

import { FormMessage } from "@/components/auth/form-message";
import { BudgetLineForm } from "@/components/budget/budget-line-form";
import { FormDialog } from "@/components/ui/form-dialog";
import { Loaded } from "@/components/ui/loaded";
import { toast } from "@/components/ui/toast";
import { loadExpenseTargets } from "@/lib/budget/target-actions";
import { centsToInput } from "@/lib/budget/types";
import { attachToCreatedSpend } from "@/lib/finance/proof-gestures";
import { proofHtCents, type FinanceProof } from "@/lib/finance/proofs";
import { budget } from "@/lib/i18n/fr/budget";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { financeReceipts } from "@/lib/i18n/fr/finance-receipts";

const t = financeReceipts.create;

/**
 * « Créer la dépense » when no spend matches the proof: the one spend form
 * (BudgetLineForm), filled with what was read — the supplier as its label,
 * the amount HT (the spend's own unit) worked out by code from the TTC, the
 * day, paid for a ticket and invoiced for an invoice — and the file as its
 * proof. Saved on a cost center or « hors budget », the proof is then
 * attached to it; saved on a project or an artist, the new spend is
 * proposed first and attached with one click.
 */
export function ReceiptNewSpend({
  proof,
  open,
  onOpenChange,
}: {
  proof: FinanceProof;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const ht = proofHtCents(proof.values);
  const done = async () => {
    onOpenChange(false);
    const result = await attachToCreatedSpend(proof.id);
    if (!result.ok) toast.error(result.error);
  };
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t.title}
      description={t.description}
      closeLabel={dialogs.close}
    >
      <Loaded
        load={loadExpenseTargets}
        loadingLabel={budget.form.loading}
        errorLabel={budget.loadError}
      >
        {(data) =>
          data.targets.length === 0 ? (
            <FormMessage kind="info">{budget.form.noTargets}</FormMessage>
          ) : (
            <BudgetLineForm
              target={null}
              targets={data.targets}
              line={null}
              initial={{
                label: proof.values.vendor ?? "",
                amount: ht === null ? "" : centsToInput(ht),
                status: proof.kind === "invoice" ? "invoiced" : "paid",
                ...(proof.values.issuedOn
                  ? { spentOn: proof.values.issuedOn }
                  : {}),
              }}
              storedProof={{ path: proof.path, name: proof.fileName }}
              onDone={done}
              onCancel={() => onOpenChange(false)}
            />
          )
        }
      </Loaded>
    </FormDialog>
  );
}
