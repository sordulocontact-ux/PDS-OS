"use client";

import { IconPaperclip } from "nucleo-sharp-essential";
import { useState } from "react";

import { FinanceSheet } from "@/components/finance/finance-sheet";
import { ReceiptCard } from "@/components/finance/receipts/receipt-card";
import { ReceiptSheet } from "@/components/finance/receipts/receipt-sheet";
import { ReceiptsDropLayer } from "@/components/finance/receipts/receipts-drop-layer";
import { ReceiptsTable } from "@/components/finance/receipts/receipts-table";
import { ReceiptsToolbar } from "@/components/finance/receipts/receipts-toolbar";
import { useProofIntake } from "@/components/finance/receipts/use-proof-intake";
import { useReceiptsLayout } from "@/components/finance/receipts/use-receipts-layout";
import { EmptyState } from "@/components/shell/empty-state";
import { CopyButton } from "@/components/ui/copy-button";
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
  const [layout, setLayout] = useReceiptsLayout();
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
            layout={layout}
            onLayout={setLayout}
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
            />
          </>
        }
      >
        {(visible) => (
          <>
            <ForwardLine address={address} />
            {layout === "grid" ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-3">
                {visible.map((row) => (
                  <ReceiptCard
                    key={row.proof.id}
                    row={row}
                    active={sheet === row.proof.id}
                    canManage={canManage}
                    onOpen={() => setSheet(row.proof.id)}
                  />
                ))}
              </div>
            ) : (
              <ReceiptsTable
                rows={visible}
                canManage={canManage}
                onOpen={(index) => setSheet(visible[index].proof.id)}
              />
            )}
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
    <p className="flex flex-wrap items-center gap-x-2 text-caption text-[color:var(--text-secondary)]">
      {t.forward}
      <span className="font-medium text-[color:var(--text-primary)]">
        {address}
      </span>
      <CopyButton
        value={address}
        label={t.copy}
        copiedLabel={t.copied}
        icon={null}
        variant="outline"
        size="xs"
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
