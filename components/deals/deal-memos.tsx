"use client";

import { EmptyNote } from "@/components/shell/empty-state";
import { Button } from "@/components/ui/button";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { PdfExportButton } from "@/components/ui/pdf-export-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { routes } from "@/lib/auth/redirects";
import { createDealMemo, validateDealMemo } from "@/lib/deals/memo-actions";
import type { DealMemo } from "@/lib/deals/memos";
import { formatTermValue } from "@/lib/deals/term-format";
import { dealMemos } from "@/lib/i18n/fr/deal-memos";
import { deals } from "@/lib/i18n/fr/deals";
import { dealMemoTone, dealTermTone } from "@/lib/ui/state-tones";
import { formatInstantDay } from "@/lib/utils/instant";

const fr = { dealMemos, deals };
const t = fr.dealMemos;

function MemoPdf({
  dealId,
  dealName,
  memo,
}: {
  dealId: string;
  dealName: string;
  memo: DealMemo;
}) {
  return (
    <PdfExportButton
      href={routes.dealMemoPdf(dealId, memo.id)}
      fileName={t.pdf.file(dealName, memo.number)}
      label={t.pdf.label}
      pendingLabel={t.pdf.pending}
      failedLabel={t.pdf.failed}
      variant="outline"
      size="sm"
    />
  );
}

/**
 * The deal memo (BIZ 7): the latest photo of the terms — its number, status,
 * who made and validated it, its terms — with its PDF; « Valider » for the
 * direction on the latest draft, « Nouveau deal memo » for whoever writes
 * the deal. A memo never changes: the terms moved since are said, and a new
 * memo photographs them. The earlier versions stay below, each with its PDF.
 */
export function DealMemos({
  dealId,
  dealName,
  memos,
  changed,
  canWrite,
  canValidate,
}: {
  dealId: string;
  dealName: string;
  memos: DealMemo[];
  // The terms moved since the latest memo.
  changed: boolean;
  canWrite: boolean;
  canValidate: boolean;
}) {
  const create = useWriteSubmit(undefined, t.created);
  const validate = useWriteSubmit(undefined, t.validated);
  const [latest, ...older] = memos;
  const newButton = canWrite && (
    <Button
      variant="outline"
      size="sm"
      disabled={create.pending}
      onClick={() => create.run(() => createDealMemo(dealId))}
    >
      {t.create}
    </Button>
  );
  if (!latest)
    return (
      <div className="flex flex-col items-start gap-3">
        <EmptyNote>{t.none}</EmptyNote>
        {newButton}
      </div>
    );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-body-lg font-semibold">
              {t.name(latest.number)}
            </span>
            <StatusBadge tone={dealMemoTone[latest.status]}>
              {t.statuses[latest.status]}
            </StatusBadge>
          </div>
          <p className="text-body-sm text-[color:var(--text-secondary)]">
            {latest.validatedAt
              ? t.validatedBy(
                  latest.validatedBy,
                  formatInstantDay(latest.validatedAt),
                )
              : t.meta(latest.createdBy, formatInstantDay(latest.createdAt))}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MemoPdf dealId={dealId} dealName={dealName} memo={latest} />
          {newButton}
          {canValidate && latest.status === "draft" && (
            <Button
              size="sm"
              disabled={validate.pending}
              onClick={() =>
                validate.run(() => validateDealMemo(dealId, latest.id))
              }
            >
              {t.validate}
            </Button>
          )}
        </div>
      </div>
      {changed && <ToneCallout tone="warning">{t.changed}</ToneCallout>}
      {latest.terms.length === 0 ? (
        <EmptyNote>{t.noTerms}</EmptyNote>
      ) : (
        <FactRows>
          {latest.terms.map((term) => (
            <FactRow
              key={term.key}
              label={fr.deals.terms.labels[term.key] ?? term.key}
              value={formatTermValue(term.format, term.value)}
              state={{
                tone: dealTermTone[term.state],
                label: fr.deals.terms.states[term.state],
              }}
            />
          ))}
        </FactRows>
      )}
      {older.length > 0 && (
        <details className="group flex flex-col gap-2">
          <summary className="w-fit cursor-pointer text-body-md font-medium text-[color:var(--text-secondary)]">
            {t.older}
          </summary>
          <FactRows className="mt-2">
            {older.map((memo) => (
              <FactRow
                key={memo.id}
                label={t.name(memo.number)}
                value={t.meta(memo.createdBy, formatInstantDay(memo.createdAt))}
                state={{
                  tone: dealMemoTone[memo.status],
                  label: t.statuses[memo.status],
                }}
                side={
                  <MemoPdf dealId={dealId} dealName={dealName} memo={memo} />
                }
              />
            ))}
          </FactRows>
        </details>
      )}
    </div>
  );
}
