"use client";

import { CreditNoteForm } from "@/components/finance/credit-note-form";
import { IncomeForm } from "@/components/finance/income-form";
import {
  CancelIncomeForm,
  ReceiptForm,
} from "@/components/finance/receipt-form";
import { ReminderForm } from "@/components/finance/reminder-form";
import { FormDialog } from "@/components/ui/form-dialog";
import type { Income } from "@/lib/finance/money-in";
import type { FinanceTarget } from "@/lib/finance/treasury-queries";
import { clientInvoices } from "@/lib/i18n/fr/client-invoices";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { treasury } from "@/lib/i18n/fr/treasury";

const fr = { clientInvoices, dialogs, treasury };

export type IncomeDialogKind =
  "receive" | "edit" | "cancel" | "remind" | "credit";

/** The modal of a gesture on an income (the « ⋯ » of its row). */
export function IncomeDialog({
  kind,
  income,
  targets,
  organizationId,
  ownerId,
  onClose,
}: {
  kind: IncomeDialogKind;
  income: Income;
  targets: FinanceTarget[];
  organizationId: string;
  ownerId: string | null;
  onClose: () => void;
}) {
  const t = fr.treasury;
  const c = fr.clientInvoices;
  const head = {
    receive: {
      title: t.receiptForm.title,
      description: t.receiptForm.description(income.label),
    },
    edit: {
      title: t.incomeForm.editTitle,
      description: t.incomeForm.description,
    },
    cancel: {
      title: t.cancelForm.title,
      description: t.cancelForm.description,
    },
    remind: {
      title: c.reminderForm.title,
      description: c.reminderForm.description(income.label),
    },
    credit: {
      title: c.creditForm.title,
      description: c.creditForm.description(
        income.label,
        income.invoiceNumber ?? "",
      ),
    },
  }[kind];
  return (
    <FormDialog
      open
      onOpenChange={(next) => !next && onClose()}
      title={head.title}
      description={head.description}
      closeLabel={fr.dialogs.close}
      size={kind === "edit" ? "medium" : "default"}
    >
      {kind === "receive" && <ReceiptForm income={income} onDone={onClose} />}
      {kind === "edit" && (
        <IncomeForm
          income={income}
          targets={targets}
          organizationId={organizationId}
          ownerId={ownerId}
          onDone={onClose}
        />
      )}
      {kind === "cancel" && (
        <CancelIncomeForm income={income} onDone={onClose} />
      )}
      {kind === "remind" && <ReminderForm income={income} onDone={onClose} />}
      {kind === "credit" && (
        <CreditNoteForm
          income={income}
          organizationId={organizationId}
          onDone={onClose}
        />
      )}
    </FormDialog>
  );
}
