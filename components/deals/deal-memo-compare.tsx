"use client";

import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { EmptyNote } from "@/components/shell/empty-state";
import { Button } from "@/components/ui/button";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { FormDialog } from "@/components/ui/form-dialog";
import { ToneCallout } from "@/components/ui/tone-callout";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { setDealMemoCheck } from "@/lib/deals/memo-actions";
import type { CompareRow } from "@/lib/deals/memos";
import { displayTermValue } from "@/lib/deals/term-format";
import { dealMemos } from "@/lib/i18n/fr/deal-memos";
import { deals } from "@/lib/i18n/fr/deals";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { dealCheckTone } from "@/lib/ui/state-tones";
import { formatInstantDay } from "@/lib/utils/instant";
import { formatAmount } from "@/lib/utils/money";

const fr = { dealMemos, deals, dialogs };
const t = fr.dealMemos.compare;

const labelOf = (key: string) => fr.deals.terms.labels[key] ?? key;

function DifferentForm({
  dealId,
  memoId,
  row,
  onDone,
}: {
  dealId: string;
  memoId: string;
  row: CompareRow;
  onDone: () => void;
}) {
  const { pending, error, run } = useWriteSubmit(onDone, t.saved);
  const [missing, setMissing] = useState(false);
  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        const note = String(
          new FormData(event.currentTarget).get("note") ?? "",
        ).trim();
        setMissing(!note);
        if (note)
          run(() =>
            setDealMemoCheck(dealId, {
              memoId,
              key: row.term.key,
              verdict: "different",
              note,
            }),
          );
      }}
    >
      <TextareaField
        id={`check-${row.term.key}`}
        name="note"
        label={t.note}
        required
        rows={3}
        maxLength={1000}
        defaultValue={
          row.check?.verdict === "different" ? (row.check.note ?? "") : ""
        }
        error={missing ? t.noteRequired : undefined}
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={t.save}
        onCancel={onDone}
      />
    </form>
  );
}

/**
 * The validated deal memo against the deal's contract (BIZ 7), term by
 * term. PDS OS does not read the contract's PDF: the amount entered on the
 * contract is compared by the code with an advance or a fee; every term is
 * checked by a person, « Conforme » or « Différent » with what the contract
 * says. The terms the contract contradicts are flagged at the top; nothing
 * is ever corrected by itself.
 */
export function DealMemoCompare({
  dealId,
  memo,
  rows,
  canWrite,
}: {
  dealId: string;
  // The latest validated memo, null when none; `rows` null without contract.
  memo: { id: string; number: number } | null;
  rows: CompareRow[] | null;
  canWrite: boolean;
}) {
  const conform = useWriteSubmit(undefined, t.saved);
  const [open, setOpen] = useState<CompareRow | null>(null);
  if (!memo) return <EmptyNote>{t.needMemo}</EmptyNote>;
  if (!rows) return <EmptyNote>{t.needContract}</EmptyNote>;
  const differs = rows.filter((row) => row.differs).length;
  const allChecked = rows.every((row) => row.check !== null);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-body-md font-medium">{t.title(memo.number)}</p>
      {differs > 0 ? (
        <ToneCallout tone="danger">{t.differs(differs)}</ToneCallout>
      ) : allChecked && rows.length > 0 ? (
        <ToneCallout tone="success">{t.allConform}</ToneCallout>
      ) : null}
      <FactRows>
        {rows.map((row) => {
          const verdict = row.check?.verdict ?? "unchecked";
          const source = [
            row.amount &&
              (row.amount.same
                ? t.amountMatches
                : t.amountDiffers(formatAmount(row.amount.contractCents))),
            row.check?.note,
            row.check &&
              t.checkedBy(row.check.by, formatInstantDay(row.check.at)),
          ]
            .filter(Boolean)
            .join(" · ");
          return (
            <FactRow
              key={row.term.key}
              label={labelOf(row.term.key)}
              value={displayTermValue(row.term.format, row.term.value)}
              state={{
                tone: row.differs ? "danger" : dealCheckTone[verdict],
                label: row.differs ? t.verdicts.different : t.verdicts[verdict],
              }}
              source={source || null}
              side={
                canWrite ? (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={conform.pending || verdict === "conform"}
                      onClick={() =>
                        conform.run(() =>
                          setDealMemoCheck(dealId, {
                            memoId: memo.id,
                            key: row.term.key,
                            verdict: "conform",
                          }),
                        )
                      }
                    >
                      {t.conform}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setOpen(row)}
                    >
                      {t.different}
                    </Button>
                  </div>
                ) : null
              }
            />
          );
        })}
      </FactRows>
      <FormDialog
        open={open !== null}
        onOpenChange={(next) => !next && setOpen(null)}
        title={open ? t.noteTitle(labelOf(open.term.key)) : ""}
        description={
          open
            ? (displayTermValue(open.term.format, open.term.value) ?? "")
            : ""
        }
        closeLabel={fr.dialogs.close}
      >
        {open && (
          <DifferentForm
            dealId={dealId}
            memoId={memo.id}
            row={open}
            onDone={() => setOpen(null)}
          />
        )}
      </FormDialog>
    </div>
  );
}
