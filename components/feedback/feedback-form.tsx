"use client";

import { useRef, useState, useTransition } from "react";

import { ChoiceCards } from "@/components/ui/choice-cards";
import { FieldError, FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import {
  ScreenshotField,
  screenshotProblem,
} from "@/components/feedback/screenshot-field";
import { Button } from "@/components/ui/button";
import { VoiceFieldControl } from "@/components/voice/voice-field-control";
import type { FieldErrors } from "@/lib/auth/form-state";
import { sendFeedback } from "@/lib/feedback/actions";
import {
  FEEDBACK_KINDS,
  FEEDBACK_MESSAGE_MAX,
  isAppPath,
  type FeedbackKind,
} from "@/lib/feedback/types";
import { MAX_SCREENSHOTS } from "@/lib/feedback/screenshot-rules";
import { uploadFeedbackScreenshot } from "@/lib/feedback/upload-screenshot";
import { fr } from "@/lib/i18n/fr";

const sameFile = (a: File, b: File) =>
  a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;

const imagesOf = (data: DataTransfer) =>
  [...data.files].filter((f) => f.type.startsWith("image/"));

// One feedback, in the feedback window: its kind, the message, optional
// screenshots (dropped or pasted anywhere in the form, or picked) and the page
// it was opened from, sent along so nobody has to describe where they were.
// The screenshots are uploaded first, from the browser, into the author's
// folder.
// `defaults`: a feedback prepared by PO, to review before sending.
export function FeedbackForm({
  organizationId,
  personId,
  pagePath,
  initialScreenshot = null,
  printScreen = false,
  defaults,
  onSent,
  onCancel,
}: {
  organizationId: string;
  personId: string;
  pagePath: string | null;
  initialScreenshot?: File | null;
  printScreen?: boolean;
  defaults?: { kind: FeedbackKind | null; message: string };
  onSent: () => void;
  onCancel: () => void;
}) {
  const t = fr.feedback;
  const initialProblem = initialScreenshot
    ? screenshotProblem(initialScreenshot)
    : null;
  const [screenshots, setScreenshots] = useState<File[]>(
    initialScreenshot && !initialProblem ? [initialScreenshot] : [],
  );
  const [errors, setErrors] = useState<FieldErrors>({
    screenshot: initialProblem ?? undefined,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // A screenshot already uploaded is not uploaded again on retry.
  const uploaded = useRef(new Map<File, string>());
  const page = pagePath && isAppPath(pagePath) ? pagePath : null;

  // Keeps the valid files, up to the limit, and says why others were left.
  const attach = (files: File[]) => {
    const next = [...screenshots];
    let problem: string | null = null;
    for (const file of files) {
      if (next.some((f) => sameFile(f, file))) continue;
      const fileProblem = screenshotProblem(file);
      if (fileProblem) problem ??= fileProblem;
      else if (next.length >= MAX_SCREENSHOTS) problem ??= t.screenshot.tooMany;
      else next.push(file);
    }
    setScreenshots(next);
    setErrors((e) => ({ ...e, screenshot: problem ?? undefined }));
  };

  const remove = (file: File) => {
    setScreenshots((files) => files.filter((f) => f !== file));
    setErrors((e) => ({ ...e, screenshot: undefined }));
  };

  const onPaste = (event: React.ClipboardEvent) => {
    const images = imagesOf(event.clipboardData);
    if (images.length === 0) return;
    event.preventDefault();
    attach(images);
  };

  // A screenshot dropped beside the zone is attached too, instead of the
  // browser leaving the page to open it.
  const onDragOver = (event: React.DragEvent) => {
    if (event.dataTransfer.types.includes("Files")) event.preventDefault();
  };
  const onDrop = (event: React.DragEvent) => {
    if (!event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    attach([...event.dataTransfer.files]);
  };

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const kind = String(data.get("kind") ?? "");
    const message = String(data.get("message") ?? "");
    const local: FieldErrors = {
      kind: kind ? undefined : t.errors.kind,
      message: message.trim() ? undefined : t.errors.messageRequired,
    };
    setErrors(local);
    setFormError(null);
    if (local.kind || local.message) return;

    startTransition(async () => {
      const uploads = await Promise.all(
        screenshots.map(async (file) => {
          const path = uploaded.current.get(file);
          if (path) return { ok: true as const, path };
          const upload = await uploadFeedbackScreenshot({
            organizationId,
            personId,
            file,
          });
          if (upload.ok) uploaded.current.set(file, upload.path);
          return upload;
        }),
      );
      const failed = uploads.find((u) => !u.ok);
      if (failed && !failed.ok) {
        setErrors({ screenshot: failed.error });
        return;
      }
      const result = await sendFeedback({
        kind,
        message,
        pagePath: page,
        screenshotPaths: uploads.flatMap((u) => (u.ok ? [u.path] : [])),
      });
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setFormError(result.fieldErrors ? null : result.error);
        return;
      }
      onSent();
    });
  };

  return (
    <form
      onSubmit={onSubmit}
      onPaste={onPaste}
      onDragOver={onDragOver}
      onDrop={onDrop}
      noValidate
      className="flex flex-col gap-5"
    >
      <div className="grid gap-1.5">
        <ChoiceCards
          name="kind"
          legend={t.kind}
          defaultValue={defaults?.kind ?? undefined}
          choices={FEEDBACK_KINDS.map((kind) => ({
            value: kind,
            label: t.kinds[kind],
            hint: t.kindHints[kind],
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
        defaultValue={defaults?.message}
        error={errors.message}
        addon={<VoiceFieldControl fieldId="message" />}
      />

      <ScreenshotField
        files={screenshots}
        onAdd={attach}
        onRemove={remove}
        error={errors.screenshot}
        printScreen={printScreen}
      />

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
          {pending ? t.submitting : t.submit}
        </Button>
      </div>
    </form>
  );
}
