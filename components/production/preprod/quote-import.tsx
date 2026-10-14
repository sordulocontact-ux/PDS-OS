"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { OptionSelect } from "@/components/framing/option-select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { FormDialog } from "@/components/ui/form-dialog";
import { Input } from "@/components/ui/input";
import { ToneCallout } from "@/components/ui/tone-callout";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { centsToInput } from "@/lib/budget/types";
import { fr } from "@/lib/i18n/fr";
import { parseEurosToCents } from "@/lib/projects/schemas";
import {
  applyQuoteImport,
  proposeQuoteImport,
} from "@/lib/production/preprod/actions-quote-import";
import type {
  QuoteLineProposal,
  QuoteProposals,
} from "@/lib/production/preprod/quote-verify";
import type { EquipmentCategory } from "@/lib/production/preprod/types";

const t = fr.productionPreprod.quoteImport;
const categories = fr.productionPreprod.equipment.categories;

type Row = QuoteLineProposal & { keep: boolean; price: string; qty: string };

/**
 * « Lire avec PO » on a quote (PROD-014): PO's reading, kept by code only
 * where it is found in the quote; each line with its source passage, a flag
 * when a value could not be checked or the line already exists; the person
 * corrects, unticks, then adds — nothing is written before.
 */
export function QuoteImportButton({
  projectId,
  sheetId,
  file,
}: {
  projectId: string;
  sheetId: string;
  file: { id: string; fileName: string };
}) {
  const [open, setOpen] = useState(false);
  const [reading, setReading] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);
  const [proposals, setProposals] = useState<QuoteProposals | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [nothing, setNothing] = useState(false);
  const close = () => setOpen(false);
  const { pending, error, run } = useWriteSubmit(close, t.applied);

  async function read() {
    // One request at a time, whatever the clicks (BUG-002).
    if (reading) return;
    setOpen(true);
    setReading(true);
    setReadError(null);
    const result = await proposeQuoteImport({
      projectId,
      sheetId,
      fileId: file.id,
    });
    setReading(false);
    if (!result.ok) return setReadError(result.error);
    setProposals(result.proposals);
    setRows(
      result.proposals.lines.map((l) => ({
        ...l,
        keep: true,
        qty: l.quantity === null ? "" : String(l.quantity),
        price: l.priceCents === null ? "" : centsToInput(l.priceCents),
      })),
    );
  }
  const patch = (key: string, change: Partial<Row>) =>
    setRows((all) => all.map((r) => (r.key === key ? { ...r, ...change } : r)));
  const kept = rows.filter((r) => r.keep);

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={read}
        disabled={reading}
        aria-busy={reading || undefined}
      >
        {reading ? t.reading : t.button}
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t.title(file.fileName)}
        description={t.description}
        closeLabel={fr.productionPost.close}
        size="wide"
      >
        {reading ? (
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {t.reading}
          </p>
        ) : readError ? (
          <div className="flex flex-col items-start gap-3">
            <FormMessage kind="error">{readError}</FormMessage>
            <Button size="sm" variant="outline" onClick={read}>
              {t.retry}
            </Button>
          </div>
        ) : (
          proposals && (
            <form
              noValidate
              className="flex flex-col gap-5"
              onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                setNothing(kept.length === 0);
                if (kept.length === 0) return;
                const deposit = parseEurosToCents(
                  String(data.get("deposit") ?? ""),
                );
                run(() =>
                  applyQuoteImport({
                    projectId,
                    sheetId,
                    fileId: file.id,
                    supplierName: String(data.get("supplier") ?? ""),
                    depositCents: deposit ?? null,
                    conditions: String(data.get("conditions") ?? ""),
                    lines: kept.map((r) => ({
                      label: r.label,
                      category: r.category,
                      quantity: /^\d{1,4}$/.test(r.qty) ? Number(r.qty) : null,
                      priceCents: parseEurosToCents(r.price) ?? null,
                      existingId: r.existingId,
                    })),
                  }),
                );
              }}
            >
              {proposals.fromImage && (
                <ToneCallout tone="warning">{t.fromImage}</ToneCallout>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  name="supplier"
                  label={t.supplier}
                  maxLength={200}
                  defaultValue={proposals.supplier ?? ""}
                />
                <Field
                  name="deposit"
                  label={t.deposit}
                  suffix="€"
                  inputMode="decimal"
                  defaultValue={
                    proposals.depositCents === null
                      ? ""
                      : centsToInput(proposals.depositCents)
                  }
                />
              </div>
              <Field
                name="conditions"
                label={t.conditions}
                maxLength={1000}
                defaultValue={proposals.conditions ?? ""}
              />
              {proposals.taxes && (
                <p className="text-sm text-muted-foreground">
                  {t.taxes(proposals.taxes)}
                </p>
              )}
              {rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t.none}</p>
              ) : (
                <ul className="flex flex-col divide-y divide-border">
                  {rows.map((r) => (
                    <li key={r.key} className="flex flex-col gap-2 py-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <Checkbox
                          aria-label={`${t.columns.keep} : ${r.label}`}
                          checked={r.keep}
                          onChange={(e) =>
                            patch(r.key, { keep: e.target.checked })
                          }
                        />
                        <Input
                          aria-label={t.columns.label}
                          className="min-w-0 flex-1"
                          value={r.label}
                          maxLength={200}
                          onChange={(e) =>
                            patch(r.key, { label: e.target.value })
                          }
                        />
                        <OptionSelect
                          id={`${r.key}-category`}
                          label={t.columns.category}
                          options={categories}
                          value={r.category}
                          onChange={(v) =>
                            patch(r.key, { category: v as EquipmentCategory })
                          }
                        />
                        <Input
                          aria-label={t.columns.quantity}
                          className="w-20"
                          inputMode="numeric"
                          value={r.qty}
                          onChange={(e) =>
                            patch(r.key, { qty: e.target.value })
                          }
                        />
                        <Input
                          aria-label={t.columns.price}
                          className="w-28"
                          inputMode="decimal"
                          value={r.price}
                          onChange={(e) =>
                            patch(r.key, { price: e.target.value })
                          }
                        />
                      </div>
                      <p className="text-xs break-words text-muted-foreground">
                        {t.source(r.quote)}
                      </p>
                      {r.uncertain && (
                        <p className="text-xs font-medium text-[color:var(--tone-warning-fg)]">
                          {t.uncertain}
                        </p>
                      )}
                      {r.existingId && (
                        <p className="text-xs font-medium">{t.existing}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {nothing && (
                <FormMessage kind="error">{t.nothingKept}</FormMessage>
              )}
              <FormMessage kind="error">{error}</FormMessage>
              <DialogFormActions
                pending={pending}
                submitLabel={t.apply(kept.length)}
                onCancel={close}
              />
            </form>
          )
        )}
      </FormDialog>
    </>
  );
}
