"use client";

import { IconXmark } from "nucleo-sharp-essential";
import { useId } from "react";

import { FieldError } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { FileDropZone } from "@/components/ui/file-drop-zone";
import { useObjectUrl } from "@/components/ui/use-object-url";
import {
  MAX_SCREENSHOT_BYTES,
  MAX_SCREENSHOTS,
  SCREENSHOT_EXTENSIONS,
} from "@/lib/feedback/screenshot-rules";
import type { FeedbackScreenshot } from "@/lib/feedback/types";
import { fr } from "@/lib/i18n/fr";

const ACCEPT = Object.keys(SCREENSHOT_EXTENSIONS).join(",");

/** Why a file cannot be attached, or null when it can. */
export function screenshotProblem(file: File): string | null {
  const t = fr.feedback.screenshot;
  if (!SCREENSHOT_EXTENSIONS[file.type]) return t.badType;
  if (file.size > MAX_SCREENSHOT_BYTES) return t.tooLarge;
  return null;
}

// The screenshots of a feedback: their previews, each with "remove" (those
// already attached, on an edit, then the new files), then a zone to drop
// more or click to pick them, until the limit. Pasting works too (the form
// takes pasted images itself).
export function ScreenshotField({
  kept = [],
  files,
  onAdd,
  onRemove,
  onRemoveKept,
  error,
  printScreen,
}: {
  kept?: FeedbackScreenshot[];
  files: File[];
  onAdd: (files: File[]) => void;
  onRemove: (file: File) => void;
  onRemoveKept?: (path: string) => void;
  error?: string;
  // Opened by Print Screen: the capture is in the clipboard, say so.
  printScreen: boolean;
}) {
  const t = fr.feedback.screenshot;
  const id = useId();
  const full = kept.length + files.length >= MAX_SCREENSHOTS;

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{t.label}</span>
      {kept.length + files.length > 0 && (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {kept.map((screenshot, index) => (
            <ScreenshotThumb
              key={screenshot.path}
              src={screenshot.url}
              number={index + 1}
              onRemove={() => onRemoveKept?.(screenshot.path)}
            />
          ))}
          {files.map((file, index) => (
            <FileThumb
              key={`${file.name}-${file.size}-${file.lastModified}`}
              file={file}
              number={kept.length + index + 1}
              onRemove={() => onRemove(file)}
            />
          ))}
        </ul>
      )}
      <FileDropZone
        label={full ? t.full : t.drop}
        hint={
          full
            ? undefined
            : printScreen
              ? t.printScreenHint
              : `${t.rules} ${t.pasteHint}`
        }
        accept={ACCEPT}
        multiple
        disabled={full}
        describedBy={error ? `${id}-error` : undefined}
        onFiles={onAdd}
      />
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </div>
  );
}

function FileThumb({
  file,
  ...props
}: {
  file: File;
  number: number;
  onRemove: () => void;
}) {
  return <ScreenshotThumb src={useObjectUrl(file)} {...props} />;
}

function ScreenshotThumb({
  src,
  number,
  onRemove,
}: {
  // A local blob preview, or the signed URL of a screenshot already sent.
  src: string | null;
  number: number;
  onRemove: () => void;
}) {
  const t = fr.feedback.screenshot;
  return (
    <li className="relative aspect-video overflow-hidden rounded-lg border border-border bg-muted">
      {src && (
        // eslint-disable-next-line @next/next/no-img-element -- blob preview or signed URL
        <img
          src={src}
          alt={t.altOf(number)}
          className="size-full object-cover"
        />
      )}
      <Button
        type="button"
        size="icon-xs"
        aria-label={t.removeOf(number)}
        onClick={onRemove}
        className="absolute top-1 right-1"
      >
        <IconXmark aria-hidden />
      </Button>
    </li>
  );
}
