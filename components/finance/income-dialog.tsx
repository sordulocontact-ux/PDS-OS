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
  "receive" | "edit" | "invoice" | "cancel" | "remind" | "credit";

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
    invoice: {
      title: c.actions.addInvoice,
      description: c.actions.addInvoiceDescription(income.label),
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
      size={kind === "edit" || kind === "invoice" ? "medium" : "default"}
    >
      {kind === "receive" && <ReceiptForm income={income} onDone={onClose} />}
      {(kind === "edit" || kind === "invoice") && (
        <IncomeForm
          income={income}
          atInvoice={kind === "invoice"}
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
