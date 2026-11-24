import { IconMoneyBillCoin } from "nucleo-sharp-essential";
import Link from "next/link";

import { SheetBlock } from "@/components/ui/record-sheet";
import { StatusBadge } from "@/components/ui/status-badge";
import { invoices as invoicesText } from "@/lib/i18n/fr/invoices";
import type { SheetInvoice } from "@/lib/invoices/sheet-types";
import { formatShortDate } from "@/lib/release/format";
import { contactInvoiceTone } from "@/lib/ui/state-tones";
import { formatAmount } from "@/lib/utils/money";

const fr = { invoices: invoicesText };

/**
 * The invoices of a record's side sheet (§ 6.7 bis: a contact's, a
 * contract's): what is left to pay beside the title, then a framed list,
 * each line to the invoice's step: icon, label and due day, amount, state.
 */
export function InvoicesSheetBlock({
  title,
  invoices,
}: {
  title: string;
  invoices: SheetInvoice[];
}) {
  if (invoices.length === 0) return null;
  const t = fr.invoices.sheet;
  const unpaid = invoices.filter((invoice) => invoice.state !== "paid");
  const due = unpaid.reduce((sum, i) => sum + (i.amountCents ?? 0), 0);
  return (
    <SheetBlock
      title={title}
      aside={
        unpaid.length > 0
          ? t.toPay(unpaid.length, formatAmount(due))
          : t.allPaid
      }
    >
      <ul className="flex flex-col overflow-hidden rounded-xl border border-[color:var(--border-default)]">
        {invoices.map((invoice) => (
          <li
            key={invoice.id}
            className="relative flex items-center gap-3 px-4 py-3 not-last:border-b not-last:border-[color:var(--border-hairline)] hover:bg-[var(--control-bg-hover)]"
          >
            <IconMoneyBillCoin
              aria-hidden
              className="size-4 shrink-0 text-[color:var(--text-secondary)]"
            />
            <div className="flex min-w-0 flex-1 flex-col">
              <Link
                href={invoice.href}
                className="truncate outline-none after:absolute after:inset-0 focus-visible:underline"
              >
                {invoice.label}
              </Link>
              {invoice.dueOn && (
                <span className="text-caption text-[color:var(--text-secondary)]">
                  {t.due(formatShortDate(invoice.dueOn))}
                </span>
              )}
            </div>
            {invoice.amountCents !== null && (
              <span className="tabular-nums">
                {formatAmount(invoice.amountCents)}
              </span>
            )}
            <StatusBadge tone={contactInvoiceTone[invoice.state]} size="sm">
              {invoice.state === "late"
                ? t.late
                : fr.invoices.states[invoice.state]}
            </StatusBadge>
          </li>
        ))}
      </ul>
    </SheetBlock>
  );
}
