"use client";

import { EmptyNote } from "@/components/shell/empty-state";
import { Button } from "@/components/ui/button";
import { DocumentCard } from "@/components/ui/document-card";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { PdfExportButton } from "@/components/ui/pdf-export-button";
import { StatusBadge } from "@/components/ui/status-badge";
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
 * The deal memo (BIZ 7) as a document card (Sacha 20/11/2026, proto « Fiche
 * d'un deal » v2): the latest photo of the terms — its number, who made and
 * validated it, its status, its terms folded inside — with its PDF; « Valider » for the
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
  if (!latest) return <EmptyNote action={newButton}>{t.none}</EmptyNote>;

  const meta = (memo: DealMemo) =>
    memo.validatedAt
      ? t.validatedBy(memo.validatedBy, formatInstantDay(memo.validatedAt))
      : t.meta(memo.createdBy, formatInstantDay(memo.createdAt));
  const badge = (memo: DealMemo) => (
    <StatusBadge tone={dealMemoTone[memo.status]} size="sm">
      {t.statuses[memo.status]}
    </StatusBadge>
  );

  return (
    <div className="flex flex-col gap-3">
      <DocumentCard
        name={t.name(latest.number)}
        line={meta(latest)}
        collapsible={latest.terms.length > 0}
        defaultOpen={false}
        change={changed ? t.changed : undefined}
        action={
          <span className="flex flex-wrap items-center gap-2">
            {badge(latest)}
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
          </span>
        }
      >
        {latest.terms.length > 0 && (
          <FactRows className="rounded-none border-0">
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
      </DocumentCard>
      {older.length > 0 && (
        <details className="group flex flex-col gap-2">
          <summary className="w-fit cursor-pointer text-body-md font-medium text-[color:var(--text-secondary)]">
            {t.older}
          </summary>
          <div className="mt-2 flex flex-col gap-2">
            {older.map((memo) => (
              <DocumentCard
                key={memo.id}
                name={t.name(memo.number)}
                line={meta(memo)}
                action={
                  <span className="flex flex-wrap items-center gap-2">
                    {badge(memo)}
                    <MemoPdf dealId={dealId} dealName={dealName} memo={memo} />
                  </span>
                }
              />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
