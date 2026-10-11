"use client";

import { IconFile } from "nucleo-sharp-essential";

import { FieldError } from "@/components/auth/form-message";
import { FileDropZone } from "@/components/ui/file-drop-zone";

/**
 * One file to deposit with a form (a reference, a version, an attachment):
 * the drop zone, then the name of the file chosen; uploaded when the form is
 * sent, not before.
 */
export function FilePickField({
  id,
  label,
  hint,
  chosenLabel,
  file,
  error,
  onFile,
}: {
  id: string;
  label: string;
  hint: string;
  chosenLabel: (name: string) => string;
  file: File | null;
  error?: string | null;
  onFile: (file: File) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <FileDropZone
        label={label}
        hint={hint}
        icon={IconFile}
        describedBy={error ? `${id}-error` : undefined}
        onFiles={(files) => files[0] && onFile(files[0])}
      />
      {file && (
        <p className="text-sm break-all text-muted-foreground">
          {chosenLabel(file.name)}
        </p>
      )}
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </div>
  );
}
