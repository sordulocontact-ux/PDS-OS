"use client";

import { useEffect, useId, useMemo } from "react";

import { FieldError } from "@/components/auth/form-message";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  MAX_SCREENSHOT_BYTES,
  SCREENSHOT_EXTENSIONS,
} from "@/lib/feedback/screenshot-rules";
import { fr } from "@/lib/i18n/fr";

const ACCEPT = Object.keys(SCREENSHOT_EXTENSIONS).join(",");

/** Why a file cannot be attached, or null when it can. */
export function screenshotProblem(file: File): string | null {
  const t = fr.feedback.screenshot;
  if (!SCREENSHOT_EXTENSIONS[file.type]) return t.badType;
  if (file.size > MAX_SCREENSHOT_BYTES) return t.tooLarge;
  return null;
}

// The screenshot of a feedback: its preview and "remove", or a file picker
// with the paste tip (the form takes pasted images itself).
export function ScreenshotField({
  file,
  onChange,
  error,
  printScreen,
}: {
  file: File | null;
  onChange: (file: File | null) => void;
  error?: string;
  // Opened by Print Screen: the capture is in the clipboard, say so.
  printScreen: boolean;
}) {
  const t = fr.feedback.screenshot;
  const id = useId();
  const preview = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file],
  );
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium" id={`${id}-label`}>
        {t.label}
      </span>
      {file && preview ? (
        <div className="flex flex-col items-start gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
          <img
            src={preview}
            alt={t.alt}
            className="max-h-48 max-w-full rounded-lg border border-border object-contain"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(null)}
          >
            {t.remove}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-start gap-1.5">
          <label
            htmlFor={id}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            {t.add}
          </label>
          <input
            id={id}
            type="file"
            accept={ACCEPT}
            aria-labelledby={`${id}-label`}
            className="sr-only"
            onChange={(event) => onChange(event.target.files?.[0] ?? null)}
          />
          <p className="text-sm text-muted-foreground">
            {printScreen ? t.printScreenHint : t.pasteHint}
          </p>
        </div>
      )}
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </div>
  );
}
