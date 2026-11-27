"use client";

import {
  proofFrom,
  proofTitle,
} from "@/components/finance/receipts/receipt-card";
import { ReceiptAction } from "@/components/finance/receipts/receipt-action";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableLink,
  DataTableMedia,
  DataTableRow,
  EMPTY_CELL,
} from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { isPhoto } from "@/lib/finance/proofs";
import type { ProofRow } from "@/lib/finance/proof-view";
import { financeReceipts } from "@/lib/i18n/fr/finance-receipts";
import { proofStateTone } from "@/lib/ui/state-tones";
import { formatDay } from "@/lib/utils/day";
import { formatAmount } from "@/lib/utils/money";
import { cn } from "@/lib/utils";

const t = financeReceipts;

/** Why the spend is proposed, or who attached it. */
function spendNote(row: ProofRow) {
  const spend = row.attached ?? row.matches[0]?.spend;
  if (!spend) return null;
  const why = row.attached
    ? row.proof.attachedBy && t.attachedBy(row.proof.attachedBy)
    : row.matches[0].reasons.map((r) => t.reasons[r]).join(" · ");
  return [spend.envelope, why].filter(Boolean).join(" · ");
}

/**
 * The proofs as a list, without their look (proto, « Liste »): received
 * on, supplier (from whom, a photo), amount, the spend proposed or
 * attached, the state with the gesture of the line. A row opens its sheet.
 */
export function ReceiptsTable({
  rows,
  canManage,
  onOpen,
}: {
  rows: ProofRow[];
  canManage: boolean;
  onOpen: (index: number) => void;
}) {
  const c = t.columns;
  return (
    <DataTable framed>
      <DataTableHeader>
        <DataTableHead icon="date" hideBelow="sm">
          {c.received}
        </DataTableHead>
        <DataTableHead icon="contact" fill>
          {c.vendor}
        </DataTableHead>
        <DataTableHead icon="amount" align="end">
          {c.amount}
        </DataTableHead>
        <DataTableHead icon="item" hideBelow="md">
          {c.spend}
        </DataTableHead>
        <DataTableHead icon="status">{c.state}</DataTableHead>
      </DataTableHeader>
      <DataTableBody>
        {rows.map((row, index) => {
          const { proof } = row;
          const spend = row.attached ?? row.matches[0]?.spend;
          return (
            <DataTableRow key={proof.id}>
              <DataTableCell hideBelow="sm" className="tabular-nums">
                {formatDay(proof.receivedAt.slice(0, 10), { weekday: false })}
              </DataTableCell>
              <DataTableCell fill>
                <DataTableMedia
                  title={
                    <DataTableLink href={null} onOpen={() => onOpen(index)}>
                      {proofTitle(row)}
                    </DataTableLink>
                  }
                  subtitle={[
                    row.state === "other" && t.kinds.other,
                    proofFrom(row),
                    isPhoto(proof) && t.photo,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                />
              </DataTableCell>
              <DataTableCell align="end" className="tabular-nums">
                {proof.values.amountCents !== null
                  ? formatAmount(proof.values.amountCents, { ht: false })
                  : EMPTY_CELL}
              </DataTableCell>
              <DataTableCell hideBelow="md">
                {spend ? (
                  <DataTableMedia
                    title={<span className="truncate">{spend.label}</span>}
                    subtitle={spendNote(row)}
                  />
                ) : (
                  EMPTY_CELL
                )}
              </DataTableCell>
              <DataTableCell>
                <span className="flex items-center gap-2">
                  <StatusBadge
                    tone={proofStateTone[row.state]}
                    // On a phone the gesture alone, which says the state.
                    className={cn(
                      canManage &&
                        (row.state === "toCheck" ||
                          (row.state === "proposed" && row.matches[0])) &&
                        "max-sm:hidden",
                    )}
                  >
                    {t.states[row.state]}
                  </StatusBadge>
                  {canManage && (
                    <ReceiptAction row={row} onCheck={() => onOpen(index)} />
                  )}
                </span>
              </DataTableCell>
            </DataTableRow>
          );
        })}
      </DataTableBody>
    </DataTable>
  );
}
