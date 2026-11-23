"use client";

import { FormMessage } from "@/components/auth/form-message";
import { MemoFileButton } from "@/components/deals/deal-memo-card";
import { DealGmailMemos } from "@/components/deals/deal-gmail-memos";
import { DealMemoDepositButton } from "@/components/deals/deal-memo-deposit-button";
import {
  DealMemoSendForm,
  type MemoReplyTo,
} from "@/components/deals/deal-memo-send";
import { nowHeading } from "@/components/deals/now-classes";
import { Button } from "@/components/ui/button";
import { DialogButton } from "@/components/ui/dialog-button";
import { PdfExportButton } from "@/components/ui/pdf-export-button";
import { ReasonForm } from "@/components/ui/reason-form";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { createDealMemo, validateDealMemo } from "@/lib/deals/memo-actions";
import {
  requestDealMemoChanges,
  submitDealMemo,
} from "@/lib/deals/memo-mail-actions";
import type { MemoFile } from "@/lib/deals/memos";
import { dealMemos } from "@/lib/i18n/fr/deal-memos";

const t = dealMemos;

/** The latest memo, as far as « Maintenant » needs it, and how to write. */
export type MemoStep = {
  stage: "negotiation" | "agreement";
  memo: {
    id: string;
    // A draft not shown yet, no changes asked: to show (or validate).
    open: boolean;
    // The direction's reason, when she asked for changes.
    changes: string | null;
    correctionSent: boolean;
    // Validated, not sent back yet.
    toSend: boolean;
    // Received from the label or the brand (else written in PDS OS).
    received: boolean;
    receivedSubject: string | null;
    // The files joined to the accord sent back, by name.
    attachment: string;
    // A draft the direction may validate (no changes asked on it).
    toValidate: boolean;
    // What to read before deciding (Sacha 22/11/2026: « on peut valider sans
    // rien regarder »): the PDF received, else the memo made here.
    file: MemoFile | null;
    pdf: { href: string; fileName: string } | null;
  } | null;
  // For « Déposer le memo reçu » (the deal's folder of deal-files).
  organizationId: string | null;
  // The label or the brand that sends it; none for a music deal, where PDS
  // writes it.
  counterpart: string | null;
  director: boolean;
  dealName: string;
  replyTo: MemoReplyTo | null;
  copies: string[];
  canEmail: boolean;
};

/**
 * The deal memo's gesture in « Maintenant » (Sacha 22/11/2026, réunion avec
 * Ibé du 18/11/2026: the deal memo is the accord de principe), one at a
 * time:
 * - a memo there, not shown: « Envoyer à valider » (« Valider » for the
 *   direction);
 * - changes asked on the label's memo: « Écrire à Wagram », the e-mail
 *   prefilled with the direction's reason, sent from PDS OS, the deal's
 *   address in reply-to; then the next version is awaited;
 * - changes asked on a memo written here: its next version, from the terms;
 * - none yet, or its next version: the label's awaited, « Déposer le memo
 *   reçu » when it came to someone's own address (Sacha 23/11/2026;
 *   « Nouveau deal memo » stays on the memo's card), or PDS writes it;
 * - the accord validated: « Renvoyer l'accord validé ».
 */
export function DealMemoNow({
  dealId,
  step,
}: {
  dealId: string;
  step: MemoStep;
}) {
  const write = useWriteSubmit(undefined, t.created);
  const go = useWriteSubmit(undefined, t.submitted);
  const memo = step.memo;
  const who = step.counterpart;
  const error = write.error ?? go.error;

  const writeButton = (variant: "default" | "outline") => (
    <Button
      variant={variant}
      disabled={write.pending}
      aria-busy={write.pending || undefined}
      onClick={() => write.run(() => createDealMemo(dealId))}
    >
      {t.now.write}
    </Button>
  );
  // The memo to read, before the gesture on it.
  const read =
    memo &&
    (memo.file ? (
      <MemoFileButton file={memo.file} size="default" />
    ) : memo.pdf ? (
      <PdfExportButton
        href={memo.pdf.href}
        fileName={memo.pdf.fileName}
        label={t.openFile}
        pendingLabel={t.pdf.pending}
        failedLabel={t.pdf.failed}
        variant="outline"
        size="sm"
      />
    ) : null);

  const mailButton = (
    label: string,
    title: string,
    description: string,
    correction: string | null,
  ) =>
    memo && (
      <DialogButton
        label={label}
        variant="default"
        size="default"
        title={title}
        description={description}
        wide
      >
        {(close) => (
          <DealMemoSendForm
            dealId={dealId}
            dealName={step.dealName}
            memoId={memo.id}
            receivedSubject={memo.receivedSubject}
            attachment={memo.attachment}
            replyTo={step.replyTo}
            copies={step.copies}
            canEmail={step.canEmail}
            correction={correction}
            open={correction === null ? read : null}
            onDone={close}
          />
        )}
      </DialogButton>
    );

  let heading: string;
  let gesture: React.ReactNode;
  if (step.director && memo?.toValidate) {
    // The direction decides on the memo itself: read, ask for changes, or
    // validate (the main gesture last, at the right).
    heading = t.now.validate;
    gesture = (
      <>
        {read}
        <DialogButton
          label={t.changes.button}
          size="default"
          title={t.changes.title}
          description={t.changes.description}
        >
          {(close) => (
            <ReasonForm
              label={t.changes.reason}
              submitLabel={t.changes.button}
              doneMessage={t.changes.done}
              run={(reason) => requestDealMemoChanges(dealId, memo.id, reason)}
              onDone={close}
            />
          )}
        </DialogButton>
        <Button
          disabled={go.pending}
          aria-busy={go.pending || undefined}
          onClick={() =>
            go.run(() => validateDealMemo(dealId, memo.id), t.validated)
          }
        >
          {t.now.validateButton}
        </Button>
      </>
    );
  } else if (step.stage === "agreement" && memo?.toSend) {
    heading = who ? t.now.resend(who) : t.send.button;
    gesture = mailButton(t.send.button, t.send.title, t.send.description, null);
  } else if (memo?.open) {
    heading = t.now.show;
    gesture = (
      <>
        {read}
        <Button
          disabled={go.pending}
          aria-busy={go.pending || undefined}
          onClick={() =>
            go.run(() => submitDealMemo(dealId, memo.id), t.submitted)
          }
        >
          {t.submit}
        </Button>
      </>
    );
  } else if (memo?.changes && memo.received && who && !memo.correctionSent) {
    heading = t.now.correct(who);
    gesture = mailButton(
      t.correction.button(who),
      t.correction.title,
      t.correction.description,
      memo.changes,
    );
  } else if (memo?.changes && !memo.received) {
    heading = t.now.rewrite;
    gesture = writeButton("default");
  } else if (who) {
    // Awaiting the label's memo, nothing to write here (Sacha 22/11/2026):
    // the PDF they sent, wherever it arrived (Sacha 23/11/2026); one sent
    // to the deal's address files itself.
    heading = (memo?.changes ? t.now.waitingAgain : t.now.waiting)(who);
    // Found in her own Gmail first (Sacha 23/11/2026), else dropped.
    gesture = (
      <>
        <DealGmailMemos dealId={dealId} />
        {step.organizationId && (
          <DealMemoDepositButton
            organizationId={step.organizationId}
            dealId={dealId}
            variant="default"
            size="default"
          />
        )}
      </>
    );
  } else {
    heading = t.now.write;
    gesture = writeButton("default");
  }

  return (
    <>
      <h2 className={nowHeading}>{heading}</h2>
      <div className="flex flex-wrap gap-2">{gesture}</div>
      {error && <FormMessage kind="error">{error}</FormMessage>}
    </>
  );
}
