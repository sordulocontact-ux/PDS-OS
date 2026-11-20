"use client";

import { DealMemoCard } from "@/components/deals/deal-memo-card";
import {
  DealMemoGestures,
  type MemoSendSetup,
} from "@/components/deals/deal-memo-gestures";
import { EmptyNote } from "@/components/shell/empty-state";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { PdfExportButton } from "@/components/ui/pdf-export-button";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { routes } from "@/lib/auth/redirects";
import { createDealMemo } from "@/lib/deals/memo-actions";
import type { DealMemo } from "@/lib/deals/memos";
import { dealMemos } from "@/lib/i18n/fr/deal-memos";

const fr = { dealMemos };
const t = fr.dealMemos;

function MemoPdf({
  dealId,
  dealName,
  memo,
}: {
  dealId: string;
  dealName: string;
  memo: DealMemo;
}) {
  return (
    <PdfExportButton
      href={routes.dealMemoPdf(dealId, memo.id)}
      fileName={t.pdf.file(dealName, memo.number)}
      label={t.pdf.label}
      pendingLabel={t.pdf.pending}
      failedLabel={t.pdf.failed}
      variant="outline"
      size="sm"
    />
  );
}

/** PO's address of the deal, where the label sends its memo or the business
 * manager forwards it (réunion avec Ibé du 18/11/2026). */
function DealAddress({ address }: { address: string }) {
  return (
    <p className="flex flex-wrap items-center gap-2 text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
      <span className="min-w-0 break-all">{t.address.label(address)}</span>
      <CopyButton
        value={address}
        label={t.address.copy}
        copiedLabel={t.address.copied}
        ariaLabel={t.address.aria}
        variant="outline"
        size="sm"
      />
    </p>
  );
}

/**
 * The deal memo (BIZ 7) as document cards (Sacha 20/11/2026, proto « Fiche
 * d'un deal » v2): the latest — received by e-mail from the label or the
 * brand and filed here by PDS OS (réunion avec Ibé du 18/11/2026), or a
 * photo of the terms made here — with its gestures (`DealMemoGestures`:
 * show it to the direction, validate or ask for changes, send the agreement
 * back), « Nouveau deal memo » for whoever writes the deal. A memo never
 * changes: the next version is a new memo. The earlier ones stay below.
 * `address`: PO's address of the deal, for whoever writes it.
 */
export function DealMemos({
  dealId,
  dealName,
  memos,
  changed,
  canWrite,
  canValidate,
  send,
  address,
}: {
  dealId: string;
  dealName: string;
  memos: DealMemo[];
  // The terms moved since the latest memo.
  changed: boolean;
  canWrite: boolean;
  canValidate: boolean;
  send: MemoSendSetup;
  address: string | null;
}) {
  const create = useWriteSubmit(undefined, t.created);
  const [latest, ...older] = memos;
  const newButton = canWrite && (
    <Button
      variant="outline"
      size="sm"
      disabled={create.pending}
      onClick={() => create.run(() => createDealMemo(dealId))}
    >
      {t.create}
    </Button>
  );
  const addressLine = canWrite && address && <DealAddress address={address} />;
  if (!latest)
    return (
      <div className="flex flex-col gap-2">
        <EmptyNote action={newButton}>
          {address ? t.noneByEmail : t.none}
        </EmptyNote>
        {addressLine}
      </div>
    );

  const pdf = (memo: DealMemo) =>
    memo.source === "pds" ? (
      <MemoPdf dealId={dealId} dealName={dealName} memo={memo} />
    ) : undefined;

  return (
    <div className="flex flex-col gap-3">
      <DealMemoCard
        memo={latest}
        changed={changed}
        open={pdf(latest)}
        actions={
          <>
            <DealMemoGestures
              dealId={dealId}
              dealName={dealName}
              memo={latest}
              canWrite={canWrite}
              canValidate={canValidate}
              send={send}
            />
            {newButton}
          </>
        }
      />
      {addressLine}
      {older.length > 0 && (
        <details className="group flex flex-col gap-2">
          <summary className="w-fit cursor-pointer text-body-md font-medium text-[color:var(--text-secondary)]">
            {t.older}
          </summary>
          <div className="mt-2 flex flex-col gap-2">
            {older.map((memo) => (
              <DealMemoCard key={memo.id} memo={memo} open={pdf(memo)} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
