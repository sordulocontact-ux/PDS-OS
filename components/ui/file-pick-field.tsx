"use client";

import { IconFile } from "nucleo-sharp-essential";
import { useId } from "react";

import { FieldError } from "@/components/auth/form-message";
import { buttonVariants } from "@/components/ui/button";
import { FileDropZone } from "@/components/ui/file-drop-zone";
import { useFileDrop } from "@/components/ui/use-file-drop";
import { core } from "@/lib/i18n/fr/core";
import { cn } from "@/lib/utils";

const fr = { core };

/**
 * One file to deposit with a form (a reference, a version, an attachment):
 * the drop zone, then the file chosen in its place, on one line with
 * « Remplacer » (Sacha 26/11/2026: an empty drop zone above a chosen file
 * reads as « still to drop »). Uploaded when the form is sent, not before.
 */
export function FilePickField({
  id,
  label,
  hint,
  accept,
  disabled,
  chosenLabel,
  file,
  error,
  onFile,
}: {
  id: string;
  label: string;
  hint?: string;
  // The formats offered by the picker (the caller still checks the file).
  accept?: string;
  disabled?: boolean;
  // Said to a screen reader on the chosen file's line.
  chosenLabel: (name: string) => string;
  file: File | null;
  error?: string | null;
  onFile: (file: File) => void;
}) {
  const describedBy = error ? `${id}-error` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      {file ? (
        <ChosenFileRow
          label={label}
          name={file.name}
          size={file.size}
          accept={accept}
          disabled={disabled}
          describedBy={describedBy}
          spoken={chosenLabel(file.name)}
          onFile={onFile}
        />
      ) : (
        <FileDropZone
          label={label}
          hint={hint}
          icon={IconFile}
          accept={accept}
          disabled={disabled}
          describedBy={describedBy}
          onFiles={(files) => files[0] && onFile(files[0])}
        />
      )}
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </div>
  );
}

/** « 1,2 Mo », « 46 Ko ». */
const sizeOf = (bytes: number) =>
  bytes >= 1_000_000
    ? `${(bytes / 1_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Mo`
    : `${Math.max(1, Math.round(bytes / 1000))} Ko`;

/** The chosen file, on one line: its name and size, « Remplacer » to pick
 * another; a file dropped on the line replaces it too. Every file chosen
 * for a form shows so (FilePickField, a template's source file). `extra`: a
 * gesture beside « Remplacer » (« Retirer »). */
export function ChosenFileRow({
  label,
  name,
  size,
  accept,
  disabled = false,
  describedBy,
  spoken,
  extra,
  onFile,
}: {
  label: string;
  name: string;
  // Unknown for a file already kept (its name only).
  size?: number;
  accept?: string;
  disabled?: boolean;
  describedBy?: string;
  spoken?: string;
  extra?: React.ReactNode;
  onFile: (file: File) => void;
}) {
  const inputId = useId();
  const { dragging, handlers } = useFileDrop({
    disabled,
    onFiles: (files) => files[0] && onFile(files[0]),
  });
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      <div
        {...handlers}
        data-dragging={dragging || undefined}
        className="flex min-w-0 items-center gap-3 rounded-lg border border-border bg-card py-2 pr-2 pl-3 transition-colors data-dragging:border-ring data-dragging:bg-muted"
      >
        <IconFile
          aria-hidden
          className="size-5 shrink-0 text-muted-foreground"
        />
        <span className="flex min-w-0 flex-1 flex-col">
          {spoken && <span className="sr-only">{spoken}</span>}
          <span aria-hidden={spoken ? true : undefined} className="truncate text-sm">
            {name}
          </span>
          {size !== undefined && (
            <span
              aria-hidden
              className="text-[length:var(--type-caption)] text-muted-foreground"
            >
              {sizeOf(size)}
            </span>
          )}
        </span>
        {extra}
        <label
          htmlFor={inputId}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "cursor-pointer has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-[color:var(--focus-ring)]",
            disabled && "pointer-events-none opacity-60",
          )}
        >
          {fr.core.filePick.replace}
          <input
            id={inputId}
            type="file"
            accept={accept}
            disabled={disabled}
            aria-describedby={describedBy}
            className="sr-only"
            onChange={(event) => {
              const chosen = event.target.files?.[0];
              event.target.value = "";
              if (chosen) onFile(chosen);
            }}
          />
        </label>
      </div>
    </div>
  );
}
