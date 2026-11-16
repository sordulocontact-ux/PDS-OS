"use client";

import { FilePickField } from "@/components/ui/file-pick-field";
import { Button } from "@/components/ui/button";
import { FINANCE_FILE_ACCEPT } from "@/lib/finance/file-rules";
import type { FinanceFile } from "@/lib/finance/money-in";
import { clientInvoices } from "@/lib/i18n/fr/client-invoices";

const fr = { clientInvoices };

/**
 * The PDF of an invoice or a credit note: the one kept, as a link, until
 * another is chosen or it is removed.
 */
export function FinanceFileField({
  id,
  label,
  hint,
  kept,
  file,
  error,
  onFile,
  onRemoveKept,
}: {
  id: string;
  label: string;
  hint: string;
  kept: FinanceFile | null;
  file: File | null;
  error?: string | null;
  onFile: (file: File) => void;
  onRemoveKept?: () => void;
}) {
  const t = fr.clientInvoices.fields;
  return (
    <div className="flex flex-col gap-1.5">
      <FilePickField
        id={id}
        label={label}
        hint={hint}
        accept={FINANCE_FILE_ACCEPT}
        chosenLabel={t.fileChosen}
        file={file}
        error={error}
        onFile={onFile}
      />
      {!file && kept && (
        <div className="flex items-center justify-between gap-3 text-body-md">
          {kept.url ? (
            <a
              href={kept.url}
              target="_blank"
              rel="noreferrer"
              className="truncate underline underline-offset-4"
            >
              {t.fileKept(kept.name)}
            </a>
          ) : (
            <span className="truncate">{t.fileKept(kept.name)}</span>
          )}
          {onRemoveKept && (
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={onRemoveKept}
            >
              {t.removeFile}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
