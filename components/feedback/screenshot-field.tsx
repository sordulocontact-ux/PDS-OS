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
import { fr } from "@/lib/i18n/fr";

const ACCEPT = Object.keys(SCREENSHOT_EXTENSIONS).join(",");

/** Why a file cannot be attached, or null when it can. */
export function screenshotProblem(file: File): string | null {
  const t = fr.feedback.screenshot;
  if (!SCREENSHOT_EXTENSIONS[file.type]) return t.badType;
  if (file.size > MAX_SCREENSHOT_BYTES) return t.tooLarge;
  return null;
}

// The screenshots of a feedback: their previews, each with "remove", then a
// zone to drop more or click to pick them, until the limit. Pasting works
// too (the form takes pasted images itself).
export function ScreenshotField({
  files,
  onAdd,
  onRemove,
  error,
  printScreen,
}: {
  files: File[];
  onAdd: (files: File[]) => void;
  onRemove: (file: File) => void;
  error?: string;
  // Opened by Print Screen: the capture is in the clipboard, say so.
  printScreen: boolean;
}) {
  const t = fr.feedback.screenshot;
  const id = useId();
  const full = files.length >= MAX_SCREENSHOTS;

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{t.label}</span>
      {files.length > 0 && (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {files.map((file, index) => (
            <ScreenshotThumb
              key={`${file.name}-${file.size}-${file.lastModified}`}
              file={file}
              number={index + 1}
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

function ScreenshotThumb({
  file,
  number,
  onRemove,
}: {
  file: File;
  number: number;
  onRemove: () => void;
}) {
  const t = fr.feedback.screenshot;
  const url = useObjectUrl(file);
  return (
    <li className="relative aspect-video overflow-hidden rounded-lg border border-border bg-muted">
      {url && (
        // eslint-disable-next-line @next/next/no-img-element -- local blob preview
        <img
          src={url}
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
