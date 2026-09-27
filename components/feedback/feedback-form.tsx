"use client";

import { useRef, useState, useTransition } from "react";

import { ChoiceCards } from "@/components/calls/choice-cards";
import { FieldError, FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import {
  ScreenshotField,
  screenshotProblem,
} from "@/components/feedback/screenshot-field";
import { Button } from "@/components/ui/button";
import type { FieldErrors } from "@/lib/auth/form-state";
import { sendFeedback } from "@/lib/feedback/actions";
import {
  FEEDBACK_KINDS,
  FEEDBACK_MESSAGE_MAX,
  isAppPath,
  type FeedbackKind,
} from "@/lib/feedback/types";
import { uploadFeedbackScreenshot } from "@/lib/feedback/upload-screenshot";
import { fr } from "@/lib/i18n/fr";

// One feedback, in the feedback window: its kind, the message, an optional
// screenshot (picked, or pasted anywhere in the form) and the page it was
// opened from, sent along so nobody has to describe where they were. The
// screenshot is uploaded first, from the browser, into the author's folder.
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
  const [screenshot, setScreenshot] = useState(
    initialProblem ? null : initialScreenshot,
  );
  const [errors, setErrors] = useState<FieldErrors>({
    screenshot: initialProblem ?? undefined,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // A screenshot already uploaded is not uploaded again on retry.
  const uploaded = useRef<{ file: File; path: string } | null>(null);
  const page = pagePath && isAppPath(pagePath) ? pagePath : null;

  const attach = (file: File | null) => {
    const problem = file ? screenshotProblem(file) : null;
    setErrors((e) => ({ ...e, screenshot: problem ?? undefined }));
    if (!problem) setScreenshot(file);
  };

  const onPaste = (event: React.ClipboardEvent) => {
    const image = [...event.clipboardData.files].find((f) =>
      f.type.startsWith("image/"),
    );
    if (!image) return;
    event.preventDefault();
    attach(image);
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
      let screenshotPath: string | null = null;
      if (screenshot) {
        if (uploaded.current?.file === screenshot) {
          screenshotPath = uploaded.current.path;
        } else {
          const upload = await uploadFeedbackScreenshot({
            organizationId,
            personId,
            file: screenshot,
          });
          if (!upload.ok) {
            setErrors({ screenshot: upload.error });
            return;
          }
          uploaded.current = { file: screenshot, path: upload.path };
          screenshotPath = upload.path;
        }
      }
      const result = await sendFeedback({
        kind,
        message,
        pagePath: page,
        screenshotPath,
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
      />

      <ScreenshotField
        file={screenshot}
        onChange={attach}
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
