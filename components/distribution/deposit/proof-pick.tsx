"use client";

import { IconPaperclip } from "nucleo-sharp-essential";

import { ProofChip } from "@/components/distribution/deposit/proof-chip";
import { FileDropZone } from "@/components/ui/file-drop-zone";

/** A proof to join (a capture, a PDF, an exported e-mail): the drop zone,
 * then the chosen file with its cross — for a deposit, a platform verified,
 * a reserve lifted. */
export function ProofPick({
  label,
  drop,
  hint,
  file,
  onFile,
}: {
  label: string;
  drop: string;
  hint: string;
  file: File | null;
  onFile: (file: File | null) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[length:var(--type-body-sm)] font-medium">
        {label}
      </span>
      {file ? (
        <span>
          <ProofChip name={file.name} onRemove={() => onFile(null)} />
        </span>
      ) : (
        <FileDropZone
          label={drop}
          hint={hint}
          icon={IconPaperclip}
          onFiles={(files) => onFile(files[0] ?? null)}
        />
      )}
    </div>
  );
}
