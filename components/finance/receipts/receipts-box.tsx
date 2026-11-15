"use client";

import { IconPaperclip } from "nucleo-sharp-essential";
import { useState } from "react";

import { FinanceSheet } from "@/components/finance/finance-sheet";
import { ReceiptSheet } from "@/components/finance/receipts/receipt-sheet";
import { ReceiptsDropLayer } from "@/components/finance/receipts/receipts-drop-layer";
import { ReceiptsTable } from "@/components/finance/receipts/receipts-table";
import { ReceiptsToolbar } from "@/components/finance/receipts/receipts-toolbar";
import { useProofIntake } from "@/components/finance/receipts/use-proof-intake";
import { EmptyState } from "@/components/shell/empty-state";
import { CopyButton } from "@/components/ui/copy-button";
import { routes } from "@/lib/auth/redirects";
import { ViewLink } from "@/components/ui/view-link";
import { buttonVariants } from "@/components/ui/button";
import { SearchableList } from "@/components/ui/searchable-list";
import {
  inProofView,
  PROOF_VIEWS,
  type ProofRow,
  type ProofView,
  type SpendRef,
} from "@/lib/finance/proof-view";
import { financeReceipts } from "@/lib/i18n/fr/finance-receipts";

const t = financeReceipts;

/**
 * Finance › Justificatifs (new style lot 6; proto, page Justificatifs): the
 * search, « À traiter / Rattachés / Tous », grid or list (remembered by the
 * browser), « Déposer »; the address to forward tickets to; the proofs as
 * cards with their look, or as a list. A proof opens in Finance's side
 * sheet; files dropped anywhere on the page are added and read.
 */
export function ReceiptsBox({
  rows,
  choices,
  view,
  canManage,
  organizationId,
  address,
}: {
  rows: ProofRow[];
  choices: SpendRef[];
  view: ProofView;
  canManage: boolean;
  organizationId: string | null;
  address: string | null;
}) {
  const [sheet, setSheet] = useState<string | null>(null);
  const intake = useProofIntake({
    organizationId,
    pending: rows
      .filter((r) => r.proof.readState === "pending")
      .map((r) => r.proof.id),
    canManage,
  });
  const counts = Object.fromEntries(
    PROOF_VIEWS.map((v) => [v, rows.filter((r) => inProofView(r, v)).length]),
  ) as Record<ProofView, number>;
  const listed = rows.filter((r) => inProofView(r, view));

  return (
    <div className="flex flex-col gap-4">
      <ReceiptsDropLayer disabled={!canManage} onFiles={intake.upload} />
      <SearchableList
        items={listed}
        searchText={(r) => [
          r.proof.values.vendor,
          r.proof.fileName,
          r.proof.values.reference,
          r.attached?.label,
          r.matches[0]?.spend.label,
        ]}
        label={t.searchLabel}
        placeholder={t.search}
        noResult={t.noResult}
        filters={
          <ReceiptsToolbar
            view={view}
            counts={counts}
            canManage={canManage}
            busy={intake.busy}
            onFiles={intake.upload}
          />
        }
        empty={
          <>
            <ForwardLine address={address} />
            <EmptyState
              icon={IconPaperclip}
              title={view === "a-traiter" ? t.emptyOpen : t.emptyAll}
              body={view === "a-traiter" ? t.emptyOpenBody : t.emptyAllBody}
              action={
                view === "a-traiter" && counts.rattaches > 0 ? (
                  <ViewLink
                    href={`${routes.financeReceipts}?vue=rattaches`}
                    className={buttonVariants({ variant: "outline" })}
                  >
                    {t.showAttached}
                  </ViewLink>
                ) : undefined
              }
            />
          </>
        }
      >
        {(visible) => (
          <>
            <ForwardLine address={address} />
            {/* The grid (ReceiptCard) is set aside for now: the list only
                (Sacha 15/11/2026). */}
            <ReceiptsTable
              rows={visible}
              canManage={canManage}
              onOpen={(index) => setSheet(visible[index].proof.id)}
            />
            <Sheet
              rows={visible}
              open={sheet}
              onOpen={setSheet}
              choices={choices}
              canManage={canManage}
            />
          </>
        )}
      </SearchableList>
    </div>
  );
}

/** « Transférez vos tickets et factures à … · Copier », when PO's mailbox
 * is set. */
function ForwardLine({ address }: { address: string | null }) {
  if (!address) return null;
  return (
    <p className="flex flex-wrap items-baseline gap-x-1.5 text-body-sm text-[color:var(--text-secondary)]">
      {t.forward}
      <span className="font-medium text-[color:var(--text-primary)]">
        {address}
      </span>
      <CopyButton
        value={address}
        label={t.copy}
        copiedLabel={t.copied}
        icon={null}
        variant="link"
        size="xs"
        className="h-auto px-0 text-body-sm text-[color:var(--text-secondary)]"
      />
    </p>
  );
}

/** The side sheet of the proof open, ↑ ↓ through the proofs shown. Kept by
 * id; a proof that leaves the view (attached from « À traiter ») closes it,
 * the toast saying what was done. */
function Sheet({
  rows,
  open,
  onOpen,
  choices,
  canManage,
}: {
  rows: ProofRow[];
  open: string | null;
  onOpen: (id: string | null) => void;
  choices: SpendRef[];
  canManage: boolean;
}) {
  const index = rows.findIndex((r) => r.proof.id === open);
  if (index < 0) return null;
  const row = rows[index];
  return (
    <FinanceSheet
      open
      onClose={() => onOpen(null)}
      title={row.proof.values.vendor ?? row.proof.fileName}
      index={index}
      total={rows.length}
      onMove={(to) => onOpen(rows[to]?.proof.id ?? null)}
    >
      <ReceiptSheet row={row} choices={choices} canManage={canManage} />
    </FinanceSheet>
  );
}
