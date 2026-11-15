"use client";

import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { FilePickField } from "@/components/ui/file-pick-field";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { importBudgetLines } from "@/lib/finance/budget-actions";
import { parseBudgetImport } from "@/lib/finance/budget-import";
import type { EnvelopeKind } from "@/lib/finance/envelopes";
import { financeBudgets } from "@/lib/i18n/fr/finance-budgets";
import { formatAmount } from "@/lib/utils/money";

const fr = { financeBudgets };

/**
 * « Importer des lignes » (the ticket's budget Dioo, « saisie ou import
 * ligne par ligne »): a table pasted from a spreadsheet, or a .csv, read
 * and counted before anything is written; each row a spend of the
 * envelope, its total and gaps then computed like any other.
 */
export function BudgetImportForm({
  kind,
  id,
  onDone,
}: {
  kind: EnvelopeKind;
  id: string;
  onDone: () => void;
}) {
  const t = fr.financeBudgets.importForm;
  const submit = useWriteSubmit(onDone, "");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [tried, setTried] = useState(false);
  const { rows, problems } = parseBudgetImport(text);
  const total = rows.reduce((s, r) => s + r.cents, 0);

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        setTried(true);
        if (rows.length === 0) return;
        submit.run(() =>
          importBudgetLines({
            kind,
            id,
            rows: rows.map((r) => ({
              label: r.label,
              family: r.family,
              familyDetail: r.familyDetail,
              subpost: r.subpost,
              cents: r.cents,
              supplier: r.supplier,
              dueOn: r.dueOn,
              status: r.status,
            })),
          }),
        );
      }}
    >
      <TextareaField
        name="import-text"
        label={t.paste}
        rows={8}
        value={text}
        error={tried && rows.length === 0 ? t.empty : undefined}
        onChange={(e) => setText(e.target.value)}
      />
      <FilePickField
        id="import-file"
        label={t.file}
        hint={t.description}
        accept=".csv,text/csv,text/plain"
        chosenLabel={(name) => name}
        file={file}
        onFile={(chosen) => {
          setFile(chosen);
          chosen
            .text()
            .then(setText)
            .catch(() => undefined);
        }}
      />
      {rows.length > 0 && (
        <FormMessage kind="info">
          {t.preview(rows.length, formatAmount(total, { ht: false }))}
        </FormMessage>
      )}
      {problems.length > 0 && (
        <FormMessage kind="error">
          {problems.map((p) => t.problem[p.problem](p.line)).join(" ")}
        </FormMessage>
      )}
      {submit.error && <FormMessage kind="error">{submit.error}</FormMessage>}
      <DialogFormActions
        pending={submit.pending}
        submitLabel={t.save(rows.length)}
        pendingLabel={t.saving}
        onCancel={onDone}
      />
    </form>
  );
}
