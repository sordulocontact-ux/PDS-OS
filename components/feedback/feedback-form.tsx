"use client";

import { useState, useTransition } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { ScreenshotField } from "@/components/feedback/screenshot-field";
import { useScreenshotAttachments } from "@/components/feedback/use-screenshot-attachments";
import { ChipChoice } from "@/components/ui/chip-choice";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { VoiceFieldControl } from "@/components/voice/voice-field-control";
import type { FieldErrors } from "@/lib/auth/form-state";
import { sendFeedback } from "@/lib/feedback/actions";
import { editFeedback } from "@/lib/feedback/edit-actions";
import type { NotionSync } from "@/lib/feedback/notion-sync";
import {
  FEEDBACK_KINDS,
  FEEDBACK_MESSAGE_MAX,
  FEEDBACK_PRIORITIES,
  isAppPath,
  type EditedFeedback,
  type FeedbackKind,
  type FeedbackPriority,
} from "@/lib/feedback/types";
import { feedback } from "@/lib/i18n/fr/feedback";

const fr = { feedback };

// One feedback, in the feedback window: its kind, the message, optional
// screenshots (dropped or pasted anywhere in the form, or picked) and the page
// it was opened from, sent along so nobody has to describe where they were.
// The screenshots are uploaded first, from the browser, into the author's
// folder.
// `defaults`: a feedback prepared by PO, to review before sending.
// `direct`: the director's own feedback, sent straight to Notion with the
// priority chosen here (no inbox to review it in).
// `editing`: the author's feedback already sent, changed in place (its page
// stays the one it was sent from).
export function FeedbackForm({
  organizationId,
  personId,
  pagePath,
  initialScreenshot = null,
  printScreen = false,
  defaults,
  direct = false,
  editing,
  onSent,
  onCancel,
}: {
  organizationId: string;
  personId: string;
  pagePath: string | null;
  initialScreenshot?: File | null;
  printScreen?: boolean;
  defaults?: { kind: FeedbackKind | null; message: string };
  direct?: boolean;
  editing?: EditedFeedback;
  onSent: (notion?: NotionSync) => void;
  onCancel: () => void;
}) {
  const t = fr.feedback;
  const screenshots = useScreenshotAttachments({
    organizationId,
    personId,
    initialScreenshot,
    initialKept: editing?.screenshots ?? [],
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const page = !editing && pagePath && isAppPath(pagePath) ? pagePath : null;
  const toNotion = direct && !editing;
  const initial = editing ?? defaults;
  const [kind, setKind] = useState<FeedbackKind | null>(initial?.kind ?? null);
  const [priority, setPriority] = useState<FeedbackPriority | null>("normal");

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const message = String(data.get("message") ?? "");
    const local: FieldErrors = {
      kind: kind ? undefined : t.errors.kind,
      message: message.trim() ? undefined : t.errors.messageRequired,
    };
    setErrors(local);
    setFormError(null);
    if (!kind || local.message) return;

    startTransition(async () => {
      const upload = await screenshots.upload();
      if (!upload.ok) return;
      const result = editing
        ? await editFeedback({
            feedbackId: editing.id,
            kind,
            message,
            screenshotPaths: upload.paths,
          })
        : await sendFeedback({
            kind,
            message,
            pagePath: page,
            screenshotPaths: upload.paths,
            priority: toNotion ? (priority ?? "normal") : undefined,
          });
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setFormError(result.fieldErrors ? null : result.error);
        return;
      }
      onSent(result.notion);
    });
  };

  const [submitLabel, pendingLabel] = editing
    ? [t.mineEdit.submit, t.mineEdit.submitting]
    : toNotion
      ? [t.directSubmit, t.directSubmitting]
      : [t.submit, t.submitting];

  return (
    <form
      onSubmit={onSubmit}
      {...screenshots.dropHandlers}
      noValidate
      className="flex flex-col gap-5"
    >
      <ChipChoice
        name="kind"
        legend={t.kind}
        required
        fill
        options={FEEDBACK_KINDS.map((k) => ({ value: k, label: t.kinds[k] }))}
        value={kind}
        onChange={(next) => next && setKind(next)}
        hint={kind ? t.kindHints[kind] : undefined}
        error={errors.kind}
      />

      <TextareaField
        name="message"
        label={t.message}
        hint={t.messageHint}
        required
        rows={4}
        maxLength={FEEDBACK_MESSAGE_MAX}
        defaultValue={initial?.message}
        error={errors.message}
        addon={<VoiceFieldControl fieldId="message" />}
      />

      <ScreenshotField
        kept={screenshots.kept}
        files={screenshots.files}
        onAdd={screenshots.attach}
        onRemove={screenshots.remove}
        onRemoveKept={screenshots.removeKept}
        error={screenshots.error}
        printScreen={printScreen}
      />

      {toNotion && (
        <ChipChoice
          name="priority"
          legend={t.review.priority}
          fill
          options={FEEDBACK_PRIORITIES.map((p) => ({
            value: p,
            label: t.priorities[p],
          }))}
          value={priority}
          onChange={(next) => next && setPriority(next)}
          hint={priority ? t.review.priorityHints[priority] : undefined}
        />
      )}

      {page && (
        <p className="text-sm text-muted-foreground">
          {t.sentFrom}{" "}
          <span className="font-mono break-all text-foreground">{page}</span>
        </p>
      )}

      {formError && <FormMessage kind="error">{formError}</FormMessage>}

      <DialogFormActions
        pending={pending}
        submitLabel={submitLabel}
        pendingLabel={pendingLabel}
        onCancel={onCancel}
      />
    </form>
  );
}
