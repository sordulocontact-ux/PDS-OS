"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { useFramingAction } from "@/components/framing/use-framing-action";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormDialog } from "@/components/ui/form-dialog";
import { TextareaField } from "@/components/auth/textarea-field";
import { BriefRequestForm } from "@/components/framing/intel/brief-request-form";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ToneCallout } from "@/components/ui/tone-callout";
import {
  decideBrief,
  generateBrief,
  sendBrief,
} from "@/lib/framing/actions/brief-versions";
import { fr } from "@/lib/i18n/fr";

/**
 * The owner's moves on the latest version: update it, or send it. A version
 * that says what the last one sent said asks why it goes again unchanged
 * (PROJ-BUG-05).
 */
export function BriefOwnerActions({
  projectId,
  briefId,
  outdated,
  unchangedFrom,
}: {
  projectId: string;
  briefId: string;
  outdated: boolean;
  // The version sent before, when this one says exactly the same thing.
  unchangedFrom: number | null;
}) {
  const t = fr.framingIntel.brief;
  const tu = fr.briefRequests.unchanged;
  const { pending, run, error, clearError } = useFramingAction();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [tried, setTried] = useState(false);
  const reasonMissing = unchangedFrom !== null && !reason.trim();

  if (outdated)
    return (
      <Button
        size="lg"
        disabled={pending}
        onClick={() => run(() => generateBrief(projectId))}
      >
        {pending
          ? fr.framingIntel.guide.generating
          : fr.framingIntel.guide.update}
      </Button>
    );
  return (
    <>
      <Button size="lg" onClick={() => setOpen(true)}>
        {t.send}
      </Button>
      <FormDialog
        open={open}
        onOpenChange={(next) => {
          clearError();
          setOpen(next);
        }}
        title={t.send}
        description={t.notSent}
        closeLabel={fr.framingGuide.close}
      >
        <form
          className="flex flex-col gap-4"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            setTried(true);
            if (reasonMissing) return;
            run(
              () => sendBrief(projectId, briefId, note, reason),
              () => setOpen(false),
              { inline: true },
            );
          }}
        >
          {unchangedFrom !== null && (
            <>
              <ToneCallout tone="warning">
                {tu.warning(unchangedFrom)}
              </ToneCallout>
              <TextareaField
                name="unchanged-reason"
                label={tu.reasonLabel}
                required
                rows={3}
                maxLength={1000}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                error={
                  tried && reasonMissing ? fr.dialogs.reasonRequired : undefined
                }
              />
            </>
          )}
          <div className="grid gap-1.5">
            <Label htmlFor="brief-note">{t.sendNote}</Label>
            <Textarea
              id="brief-note"
              value={note}
              maxLength={500}
              rows={3}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          {error && <FormMessage kind="error">{error}</FormMessage>}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="lg" disabled={pending}>
              {pending ? t.sending : t.send}
            </Button>
          </div>
        </form>
      </FormDialog>
    </>
  );
}

/**
 * The validator's decision (ticket § 8): « Valider le Brief », refused while
 * a mandatory request is open (said in the dialog, PROJ-BUG-05), or
 * « Demander une modification » as anchored requests (PROJ-UX-06).
 */
export function BriefValidatorActions({
  projectId,
  validationId,
  openMandatory,
}: {
  projectId: string;
  validationId: string;
  openMandatory: number;
}) {
  const t = fr.framingIntel.brief;
  const tr = fr.briefRequests;
  const router = useRouter();
  const { pending, run, error, clearError } = useFramingAction({
    inline: true,
  });
  const [approving, setApproving] = useState(false);
  const [asking, setAsking] = useState(false);
  const blocked = openMandatory > 0;

  return (
    <>
      <Button size="lg" variant="outline" onClick={() => setAsking(true)}>
        {t.requestChange}
      </Button>
      <Button size="lg" onClick={() => setApproving(true)}>
        {t.approve}
      </Button>
      <ConfirmDialog
        open={approving}
        onOpenChange={(next) => {
          clearError();
          setApproving(next);
        }}
        title={blocked ? tr.approveBlockedTitle : t.approveTitle}
        description={blocked ? tr.blocking(openMandatory) : t.approveBody}
        cancelLabel={fr.framingIntel.guide.cancel}
        closeLabel={fr.framingGuide.close}
        confirmLabel={t.approve}
        pendingLabel={t.sending}
        pending={pending}
        error={error}
        onConfirm={
          blocked
            ? undefined
            : () =>
                run(
                  () => decideBrief(projectId, validationId, true, "", []),
                  () => {
                    setApproving(false);
                    router.refresh();
                  },
                )
        }
      />
      <FormDialog
        open={asking}
        onOpenChange={(next) => {
          clearError();
          setAsking(next);
        }}
        title={tr.form.title}
        description={tr.form.intro}
        closeLabel={fr.framingGuide.close}
        size="wide"
      >
        <BriefRequestForm
          pending={pending}
          error={error}
          onCancel={() => setAsking(false)}
          onSubmit={(requests, comment) =>
            run(
              () =>
                decideBrief(projectId, validationId, false, comment, requests),
              () => setAsking(false),
            )
          }
        />
      </FormDialog>
    </>
  );
}
