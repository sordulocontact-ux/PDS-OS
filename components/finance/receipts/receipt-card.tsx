"use client";

import { ReceiptAction } from "@/components/finance/receipts/receipt-action";
import { ReceiptThumb } from "@/components/finance/receipts/receipt-thumb";
import { StatusBadge } from "@/components/ui/status-badge";
import type { ProofRow } from "@/lib/finance/proof-view";
import { financeReceipts } from "@/lib/i18n/fr/finance-receipts";
import { proofStateTone } from "@/lib/ui/state-tones";
import { cn } from "@/lib/utils";
import { formatDay } from "@/lib/utils/day";
import { formatAmount } from "@/lib/utils/money";

const t = financeReceipts;

/** The line that names a proof: its supplier, else « Fournisseur à lire »;
 * a document that is no proof is named by its file. */
export const proofTitle = (row: ProofRow) =>
  row.proof.values.vendor ??
  (row.state === "other" ? row.proof.fileName : t.card.unknownVendor);

export const proofFrom = (row: ProofRow) =>
  row.proof.from ?? row.proof.emailFrom ?? t.sheet.someone;

/**
 * One proof in the grid (proto, page Justificatifs, after Midday's Vault):
 * its look with its state on it, supplier and amount, day and sender, the
 * spend proposed or attached with its envelope, the gesture of its line.
 * The whole card opens its sheet; the gesture sits above that.
 */
export function ReceiptCard({
  row,
  active,
  canManage,
  onOpen,
}: {
  row: ProofRow;
  active: boolean;
  canManage: boolean;
  onOpen: () => void;
}) {
  const { proof } = row;
  const spend = row.attached ?? row.matches[0]?.spend ?? null;
  return (
    <article
      className={cn(
        "relative flex min-w-0 flex-col rounded-[var(--radius-lg)] border border-[color:var(--border-default)] bg-[var(--surface-raised)]",
        active && "border-[color:var(--text-primary)]",
      )}
    >
      <button
        type="button"
        className="absolute inset-0 z-[1] cursor-pointer rounded-[inherit] outline-none focus-visible:outline-2 focus-visible:outline-ring"
        aria-label={t.card.open(proof.values.vendor ?? proof.fileName)}
        onClick={onOpen}
      />
      <ReceiptThumb proof={proof} />
      <StatusBadge
        tone={proofStateTone[row.state]}
        size="sm"
        className="absolute top-2 right-2"
      >
        {t.states[row.state]}
      </StatusBadge>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <p className="flex items-baseline justify-between gap-3">
          <span className="truncate font-medium">{proofTitle(row)}</span>
          <span className="shrink-0 tabular-nums">
            {proof.values.amountCents !== null
              ? formatAmount(proof.values.amountCents, { ht: false })
              : ""}
          </span>
        </p>
        <p className="truncate text-caption text-[color:var(--text-tertiary)]">
          {[
            row.state === "other" && t.kinds.other,
            t.card.from(
              formatDay(proof.receivedAt.slice(0, 10), { weekday: false }),
              proofFrom(row),
            ),
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <p className="line-clamp-2 text-caption text-[color:var(--text-secondary)]">
          {spend ? (
            <>
              {row.attached ? t.card.attachedTo : t.card.proposed} :{" "}
              <span className="text-[color:var(--text-primary)]">
                {spend.label}
              </span>
            </>
          ) : row.state === "other" ? null : (
            t.card.waiting
          )}
        </p>
        <div className="mt-auto flex items-center gap-2 pt-1">
          {spend && (
            <StatusBadge tone="neutral" size="sm" className="min-w-0 truncate">
              {spend.envelope}
            </StatusBadge>
          )}
          <span className="flex-1" />
          {canManage && <ReceiptAction row={row} onCheck={onOpen} />}
        </div>
      </div>
    </article>
  );
}
