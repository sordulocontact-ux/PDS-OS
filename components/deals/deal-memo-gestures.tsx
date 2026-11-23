"use client";

import { IconMsgPen2 } from "nucleo-sharp-essential";

import {
  DealMemoSendForm,
  type MemoReplyTo,
} from "@/components/deals/deal-memo-send";
import { MemoFileButton } from "@/components/deals/deal-memo-card";
import { Button } from "@/components/ui/button";
import { PdfExportButton } from "@/components/ui/pdf-export-button";
import { routes } from "@/lib/auth/redirects";
import { DialogButton } from "@/components/ui/dialog-button";
import { ReasonForm } from "@/components/ui/reason-form";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { validateDealMemo } from "@/lib/deals/memo-actions";
import {
  requestDealMemoChanges,
  submitDealMemo,
} from "@/lib/deals/memo-mail-actions";
import type { DealMemo } from "@/lib/deals/memos";
import { dealMemos } from "@/lib/i18n/fr/deal-memos";

const fr = { dealMemos };
const t = fr.dealMemos;

/** What the memo sent back needs: who receives it, the copies, SMTP. */
export type MemoSendSetup = {
  replyTo: MemoReplyTo | null;
  // The loop's contacts' addresses, prefilled in « Cc ».
  copies: string[];
  canEmail: boolean;
  // The deal is at the accord (« Accord de principe »): sending the
  // validated memo back moves it to contracting, so it is never offered
  // after (Sacha 23/11/2026: « j'ai déjà envoyé l'accord validé »).
  atAccord: boolean;
};

/**
 * The gestures of the latest deal memo, in its order (réunion avec Ibé du
 * 18/11/2026): the business manager shows it to the direction; the
 * direction validates it or asks for changes with a written reason (the
 * icons first, the main gesture last, at the right: Sacha 22/11/2026)
 * (docs/VISION-UX.md rule 6); once validated, the business manager sends
 * the agreement back by e-mail (`DealMemoSendForm`). The database decides
 * again on each one.
 */
export function DealMemoGestures({
  dealId,
  dealName,
  memo,
  canWrite,
  canValidate,
  send,
}: {
  dealId: string;
  dealName: string;
  memo: DealMemo;
  canWrite: boolean;
  // The direction.
  canValidate: boolean;
  send: MemoSendSetup;
}) {
  const submit = useWriteSubmit(undefined, t.submitted);
  const validate = useWriteSubmit(undefined, t.validated);
  const open = memo.status === "draft" && !memo.changes;
  const attachment =
    memo.files.length > 0
      ? memo.files.map((f) => f.name).join(", ")
      : t.pdf.file(dealName, memo.number);

  return (
    <>
      {open && canValidate && (
        <>
          <DialogButton
            label={t.changes.button}
            icon={IconMsgPen2}
            iconOnly
            iconSize="icon-sm"
            title={t.changes.title}
            description={t.changes.description}
          >
            {(close) => (
              <ReasonForm
                label={t.changes.reason}
                submitLabel={t.changes.button}
                doneMessage={t.changes.done}
                run={(reason) =>
                  requestDealMemoChanges(dealId, memo.id, reason)
                }
                onDone={close}
              />
            )}
          </DialogButton>
          <Button
            size="sm"
            disabled={validate.pending}
            onClick={() =>
              validate.run(() => validateDealMemo(dealId, memo.id))
            }
          >
            {t.validate}
          </Button>
        </>
      )}
      {open && canWrite && !canValidate && !memo.submitted && (
        <Button
          size="sm"
          disabled={submit.pending}
          onClick={() => submit.run(() => submitDealMemo(dealId, memo.id))}
        >
          {t.submit}
        </Button>
      )}
      {memo.status === "validated" &&
        !memo.sent &&
        send.atAccord &&
        canWrite && (
          <DialogButton
            label={t.send.button}
            variant="default"
            title={t.send.title}
            description={t.send.description}
            wide
          >
            {(close) => (
              <DealMemoSendForm
                dealId={dealId}
                dealName={dealName}
                memoId={memo.id}
                receivedSubject={memo.email?.subject ?? null}
                attachment={attachment}
                replyTo={send.replyTo}
                copies={send.copies}
                canEmail={send.canEmail}
                open={
                  memo.files[0]?.url ? (
                    <MemoFileButton file={memo.files[0]} />
                  ) : (
                    <PdfExportButton
                      href={routes.dealMemoPdf(dealId, memo.id)}
                      fileName={t.pdf.file(dealName, memo.number)}
                      label={t.openFile}
                      pendingLabel={t.pdf.pending}
                      failedLabel={t.pdf.failed}
                      variant="outline"
                      size="sm"
                    />
                  )
                }
                onDone={close}
              />
            )}
          </DialogButton>
        )}
    </>
  );
}
