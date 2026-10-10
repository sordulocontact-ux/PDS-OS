"use client";

import { IconXmark } from "nucleo-sharp-essential";

import { Button } from "@/components/ui/button";
import { formatFileSize } from "@/lib/catalog/file-rules";
import { fr } from "@/lib/i18n/fr";

/** The files picked for a deposit, each removable before sending. */
export function ChosenFiles({
  files,
  disabled,
  onRemove,
}: {
  files: File[];
  disabled?: boolean;
  onRemove: (index: number) => void;
}) {
  const t = fr.conceptionRefs.add;
  if (files.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {t.chosen(files.length)}
      </p>
      <ul className="flex flex-col gap-1.5">
        {files.map((file, index) => (
          <li
            key={`${file.name}-${file.size}-${index}`}
            className="flex items-center gap-2 rounded-lg border border-border py-1.5 pr-1.5 pl-3"
          >
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {file.name}
            </span>
            <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
              {formatFileSize(file.size)}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={disabled}
              aria-label={t.removeFile(file.name)}
              onClick={() => onRemove(index)}
            >
              <IconXmark aria-hidden />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
