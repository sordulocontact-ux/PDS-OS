"use client";

import { FilePickField } from "@/components/ui/file-pick-field";
import type { BudgetLine, BudgetTarget } from "@/lib/budget/types";
import { budget } from "@/lib/i18n/fr/budget";

const fr = { budget };

// A photo of the ticket or a PDF: what a phone's picker offers at once.
const PROOF_ACCEPT = "image/*,application/pdf";

/**
 * The proof of a spend (BUD 1): a photo of the ticket or the invoice, never
 * required; the one already kept, as a link, until another is chosen.
 */
export function BudgetProofField({
  target,
  line,
  file,
  error,
  onFile,
}: {
  // Where it is kept says the hint; none chosen yet in a quick entry.
  target: BudgetTarget | null;
  line: BudgetLine | null;
  file: File | null;
  error?: string | null;
  onFile: (file: File) => void;
}) {
  const t = fr.budget.form;
  const kept = !file && line?.attachment;
  return (
    <div className="flex flex-col gap-1.5">
      <FilePickField
        id="budget-proof"
        label={t.attachment}
        hint={
          target?.kind === "artist" ? t.attachmentHintArtist : t.attachmentHint
        }
        accept={PROOF_ACCEPT}
        chosenLabel={(name) => t.attachmentKept(name)}
        file={file}
        error={error}
        onFile={onFile}
      />
      {kept && (
        <p className="text-sm text-[color:var(--text-secondary)]">
          {kept.url ? (
            <a href={kept.url} className="underline underline-offset-4">
              {t.attachmentKept(kept.name)}
            </a>
          ) : (
            t.attachmentKept(kept.name)
          )}
        </p>
      )}
    </div>
  );
}
