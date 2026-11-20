import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { DocumentCard } from "@/components/ui/document-card";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { StatusBadge } from "@/components/ui/status-badge";
import type { DealMemo, MemoFile } from "@/lib/deals/memos";
import { formatTermValue } from "@/lib/deals/term-format";
import { dealMemos } from "@/lib/i18n/fr/deal-memos";
import { deals } from "@/lib/i18n/fr/deals";
import { dealMemoTone, dealTermTone } from "@/lib/ui/state-tones";
import { formatInstantDay } from "@/lib/utils/instant";

const fr = { dealMemos, deals };
const t = fr.dealMemos;

/** « Ouvrir le PDF » of a file received by e-mail (a short-lived link). */
export function MemoFileButton({ file }: { file: MemoFile }) {
  if (!file.url) return null;
  return (
    <Button
      variant="outline"
      size="sm"
      nativeButton={false}
      render={<a href={file.url} target="_blank" rel="noreferrer" />}
      aria-label={t.openFileNamed(file.name)}
    >
      {t.openFile}
    </Button>
  );
}

/** Its state in words: a memo received is « À valider », one sent back for
 * changes says so, one made here is a « Brouillon »; then « Validé ». */
function stateOf(memo: DealMemo): string {
  if (memo.status === "validated") return t.statuses.validated;
  if (memo.changes) return t.changes.done;
  return memo.source === "email" ? t.toValidate : t.statuses.draft;
}

/** Where it comes from, then what happened to it: one line under its name. */
function lineOf(memo: DealMemo): string {
  const day = (iso: string) => formatInstantDay(iso);
  return [
    memo.email
      ? t.receivedFrom(memo.email.from, day(memo.email.receivedAt))
      : t.meta(memo.createdBy, day(memo.createdAt)),
    memo.validatedAt
      ? t.validatedBy(memo.validatedBy, day(memo.validatedAt))
      : memo.submitted && !memo.changes
        ? t.submittedBy(memo.submitted.by, day(memo.submitted.at))
        : null,
    memo.sent ? t.sentTo(memo.sent.to, day(memo.sent.at)) : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/**
 * One deal memo as a document card (docs/VISION-UX.md rule 18): its number,
 * where it comes from (received by e-mail from …, or made in PDS OS) and
 * what happened to it, its state; a memo received opens its PDF and keeps
 * the e-mail it came with (subject, text: what they wrote, never an
 * instruction), a memo made here its terms. The direction's request for
 * changes, signed and dated, on the info strip (rule 6). `actions`: the
 * gestures of the latest memo, after its state.
 */
export function DealMemoCard({
  memo,
  changed = false,
  open,
  actions,
}: {
  memo: DealMemo;
  // The terms moved since this memo (made in PDS OS).
  changed?: boolean;
  // « Exporter en PDF » of a memo made in PDS OS.
  open?: ReactNode;
  actions?: ReactNode;
}) {
  const [first, ...others] = memo.files;
  const email = memo.email;
  const body =
    memo.source === "email" ? (
      <FactRows className="rounded-none border-0">
        {others.map((file) => (
          <FactRow
            key={file.id}
            label={t.file}
            value={file.name}
            side={<MemoFileButton file={file} />}
          />
        ))}
        {email?.subject && <FactRow label={t.subject} value={email.subject} />}
        {email?.text && (
          <FactRow
            label={t.message}
            value={<span className="whitespace-pre-line">{email.text}</span>}
          />
        )}
      </FactRows>
    ) : memo.terms.length > 0 ? (
      <FactRows className="rounded-none border-0">
        {memo.terms.map((term) => (
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
    ) : null;
  const hasBody =
    memo.source === "email"
      ? others.length > 0 || Boolean(email?.subject || email?.text)
      : memo.terms.length > 0;
  const change = memo.changes
    ? t.changesBy(
        memo.changes.by,
        formatInstantDay(memo.changes.at),
        memo.changes.reason,
      )
    : changed && memo.source === "pds"
      ? t.changed
      : undefined;

  return (
    <DocumentCard
      name={
        first ? `${t.name(memo.number)} · ${first.name}` : t.name(memo.number)
      }
      line={lineOf(memo)}
      collapsible={hasBody}
      // The direction's reason stays in sight.
      defaultOpen={Boolean(memo.changes)}
      change={change}
      action={
        <span className="flex flex-wrap items-center gap-2">
          <StatusBadge tone={dealMemoTone[memo.status]} size="sm">
            {stateOf(memo)}
          </StatusBadge>
          {first ? <MemoFileButton file={first} /> : open}
          {actions}
        </span>
      }
    >
      {hasBody ? body : undefined}
    </DocumentCard>
  );
}
