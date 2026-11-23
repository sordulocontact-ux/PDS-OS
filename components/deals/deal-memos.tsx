"use client";

import { DealMemoCard } from "@/components/deals/deal-memo-card";
import { DealMemoDepositButton } from "@/components/deals/deal-memo-deposit-button";
import {
  DealMemoGestures,
  type MemoSendSetup,
} from "@/components/deals/deal-memo-gestures";
import { EmptyNote } from "@/components/shell/empty-state";
import { Button } from "@/components/ui/button";
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
      iconOnly
    />
  );
}

/** « Nouveau deal memo » in the head of its section (Sacha 23/11/2026, as
 * « Calls »): a draft photo of the terms now. */
export function NewDealMemoButton({ dealId }: { dealId: string }) {
  const create = useWriteSubmit(undefined, t.created);
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={create.pending}
      onClick={() => create.run(() => createDealMemo(dealId))}
    >
      {t.create}
    </Button>
  );
}

/**
 * The deal memo (BIZ 7) as document cards (Sacha 20/11/2026, proto « Fiche
 * d'un deal » v2): the latest — received by e-mail from the label or the
 * brand and filed here by PDS OS (réunion avec Ibé du 18/11/2026), or a
 * photo of the terms made here — with its gestures (`DealMemoGestures`:
 * show it to the direction, validate or ask for changes, send the agreement
 * back), « Nouveau deal memo » for whoever writes the deal, and with no memo
 * yet « Déposer le memo reçu » (the label's PDF, received anywhere). A memo
 * never changes: the next version is a new memo. The earlier ones stay
 * below. PO's address of the deal is no longer shown (Sacha 23/11/2026: no
 * one gives it to a label); it stays the reply-to of what PDS OS sends.
 */
export function DealMemos({
  dealId,
  dealName,
  memos,
  changed,
  canWrite,
  canValidate,
  send,
  organizationId,
}: {
  dealId: string;
  dealName: string;
  memos: DealMemo[];
  // The terms moved since the latest memo.
  changed: boolean;
  canWrite: boolean;
  canValidate: boolean;
  send: MemoSendSetup;
  organizationId: string | null;
}) {
  const [latest, ...older] = memos;
  if (!latest)
    return (
      <EmptyNote
        action={
          canWrite && (
            <div className="flex flex-wrap justify-center gap-2">
              {organizationId && (
                <DealMemoDepositButton
                  organizationId={organizationId}
                  dealId={dealId}
                />
              )}
            </div>
          )
        }
      >
        {t.none}
      </EmptyNote>
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
          </>
        }
      />
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
