"use client";

import { useState, useTransition } from "react";

import { ChoiceCards } from "@/components/ui/choice-cards";
import { FieldError, FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { ScreenshotField } from "@/components/feedback/screenshot-field";
import { useScreenshotAttachments } from "@/components/feedback/use-screenshot-attachments";
import { Button } from "@/components/ui/button";
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
} from "@/lib/feedback/types";
import { fr } from "@/lib/i18n/fr";

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

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const kind = String(data.get("kind") ?? "");
    const message = String(data.get("message") ?? "");
    const priority = toNotion ? String(data.get("priority") ?? "") : undefined;
    const local: FieldErrors = {
      kind: kind ? undefined : t.errors.kind,
      message: message.trim() ? undefined : t.errors.messageRequired,
    };
    setErrors(local);
    setFormError(null);
    if (local.kind || local.message) return;

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
            priority,
          });
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setFormError(result.fieldErrors ? null : result.error);
        return;
      }
      onSent(result.notion);
    });
  };

  const submitLabel = editing
    ? pending
      ? t.mineEdit.submitting
      : t.mineEdit.submit
    : toNotion
      ? pending
        ? t.directSubmitting
        : t.directSubmit
      : pending
        ? t.submitting
        : t.submit;

  return (
    <form
      onSubmit={onSubmit}
      {...screenshots.dropHandlers}
      noValidate
      className="flex flex-col gap-5"
    >
      <div className="grid gap-1.5">
        <ChoiceCards
          name="kind"
          legend={t.kind}
          required
          columns={3}
          defaultValue={initial?.kind ?? undefined}
          choices={FEEDBACK_KINDS.map((kind) => ({
            value: kind,
            label: t.kinds[kind],
          }))}
        />
        <FieldError id="kind-error">{errors.kind}</FieldError>
      </div>

      <TextareaField
        name="message"
        label={t.message}
        hint={t.messageHint}
        required
        rows={5}
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
        <ChoiceCards
          name="priority"
          legend={t.review.priority}
          columns={3}
          defaultValue="normal"
          choices={FEEDBACK_PRIORITIES.map((priority) => ({
            value: priority,
            label: t.priorities[priority],
          }))}
        />
      )}

      {page && (
        <p className="text-sm text-muted-foreground">
          {t.sentFrom}{" "}
          <span className="font-mono break-all text-foreground">{page}</span>
        </p>
      )}

      {formError && <FormMessage kind="error">{formError}</FormMessage>}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" size="lg" onClick={onCancel}>
          {t.cancel}
        </Button>
        <Button
          type="submit"
          size="lg"
          disabled={pending}
          aria-busy={pending || undefined}
        >
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
