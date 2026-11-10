"use client";

import { IconVolumeUp, IconXmark } from "nucleo-sharp-essential";
import { useId } from "react";

import { FieldError } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { FileDropZone } from "@/components/ui/file-drop-zone";
import { Label } from "@/components/ui/label";
import { AUDIO_ACCEPT, formatFileSize } from "@/lib/catalog/file-rules";
import { formatDuration } from "@/lib/catalog/types";
import { catalogFiles } from "@/lib/i18n/fr/catalog-files";
import { masterPage } from "@/lib/i18n/fr/master-page";

const fr = { catalogFiles, masterPage };

/**
 * One audio file chosen before it is sent: a drop zone, then the chosen
 * file (size, duration read by the browser) with ✕ to take it back. The file
 * stays in the browser; the caller uploads it.
 */
export function AudioFileField({
  label,
  hint,
  file,
  durationSeconds,
  error,
  disabled,
  onChange,
}: {
  label: string;
  hint: string;
  file: File | null;
  durationSeconds: number | null;
  error?: string;
  disabled?: boolean;
  onChange: (file: File | null) => void;
}) {
  const id = useId();
  const t = fr.masterPage.audio;
  const meta = [
    file ? formatFileSize(file.size) : null,
    durationSeconds ? formatDuration(durationSeconds) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex flex-col gap-1.5">
      <Label id={`${id}-label`}>{label}</Label>
      {file ? (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2">
          <IconVolumeUp
            aria-hidden
            className="size-5 shrink-0 text-muted-foreground"
          />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-medium">{file.name}</span>
            <span className="text-sm text-muted-foreground tabular-nums">
              {meta}
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={disabled}
            aria-label={fr.catalogFiles.remove(file.name)}
            onClick={() => onChange(null)}
          >
            <IconXmark aria-hidden />
          </Button>
        </div>
      ) : (
        <FileDropZone
          label={t.add}
          hint={hint}
          accept={AUDIO_ACCEPT}
          icon={IconVolumeUp}
          disabled={disabled}
          describedBy={error ? `${id}-error` : `${id}-label`}
          onFiles={(files) => onChange(files[0] ?? null)}
        />
      )}
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </div>
  );
}
