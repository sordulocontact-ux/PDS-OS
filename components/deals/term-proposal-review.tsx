"use client";

import {
  IconChevronLeft,
  IconChevronRight,
  IconSparkle3,
} from "nucleo-sharp-essential";

import { DismissButton } from "@/components/deals/deal-call-proposals";
import { Button } from "@/components/ui/button";
import {
  documentCardClass,
  documentHeadClass,
} from "@/components/ui/document-card-classes";
import { FactSourceText } from "@/components/ui/fact-row-frame";
import { StatusDot } from "@/components/ui/status-dot";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { routes } from "@/lib/auth/redirects";
import type { DealCallProposal } from "@/lib/deals/call-queries";
import { formatTermValue } from "@/lib/deals/term-format";
import { setDealTerm } from "@/lib/deals/term-actions";
import type { DealTerm } from "@/lib/deals/terms";
import { dealCalls } from "@/lib/i18n/fr/deal-calls";
import { deals } from "@/lib/i18n/fr/deals";
import { dealTermTone } from "@/lib/ui/state-tones";
import { cn } from "@/lib/utils";
import { formatInstantDay } from "@/lib/utils/instant";

const fr = { dealCalls, deals };

export type TermProposal = Extract<DealCallProposal, { kind: "term" }>;

/**
 * PO's term proposals from the deal's calls, reviewed one at a time above
 * the terms (Sacha 21/11/2026: « une autre ergonomie »; Mobbin: Writer's
 * before → after, Dovetail's and Ferndesk's « 1 of n » review): the term, its
 * value now struck through and the one PO read, its state, the passage it
 * comes from; « Appliquer » writes it as read, « Modifier » opens the term's
 * form prefilled, « Écarter » sets it aside. The arrows go through them.
 */
export function TermProposalReview({
  dealId,
  proposals,
  terms,
  index,
  onIndex,
  onEdit,
  canWrite,
}: {
  dealId: string;
  proposals: TermProposal[];
  terms: Map<string, DealTerm>;
  index: number;
  onIndex: (index: number) => void;
  // Opens the term's form with the proposal (DealTerms' dialog).
  onEdit: (term: DealTerm, proposalId: string) => void;
  canWrite: boolean;
}) {
  const t = fr.dealCalls.review;
  const { pending, run } = useWriteSubmit(
    () => {},
    fr.dealCalls.proposals.applied,
  );
  const p = proposals[Math.min(index, proposals.length - 1)];
  const term = p && terms.get(p.termKey);
  if (!p || !term) return null;
  const label = fr.deals.terms.labels[term.key] ?? term.key;
  const before =
    term.state === "to_define"
      ? null
      : formatTermValue(term.format, term.value);
  const after = formatTermValue(term.format, p.value) ?? "";
  const count = proposals.length;
  return (
    <section aria-label={t.label(count)} className={documentCardClass}>
      <header className={cn(documentHeadClass(true), "gap-2 py-2")}>
        <IconSparkle3 aria-hidden className="size-4 shrink-0" />
        <span className="flex-1 text-body-sm font-semibold">
          {t.title(count)}
        </span>
        {count > 1 && (
          <span className="flex items-center gap-1">
            <span className="text-caption text-[color:var(--text-secondary)] tabular-nums">
              {t.position(index + 1, count)}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t.previous}
              disabled={index === 0}
              onClick={() => onIndex(index - 1)}
            >
              <IconChevronLeft aria-hidden />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t.next}
              disabled={index >= count - 1}
              onClick={() => onIndex(index + 1)}
            >
              <IconChevronRight aria-hidden />
            </Button>
          </span>
        )}
      </header>
      <div className="flex flex-col gap-2 p-4">
        <span className="text-caption text-[color:var(--text-secondary)]">
          {label}
        </span>
        <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-body-md">
          {before && before !== after && (
            <>
              <s className="text-[color:var(--text-tertiary)]">{before}</s>
              <span aria-hidden className="text-[color:var(--text-tertiary)]">
                →
              </span>
            </>
          )}
          <b className="font-semibold">{after}</b>
          <StatusDot
            tone={dealTermTone[p.state]}
            label={fr.deals.terms.states[p.state]}
            showLabel
          />
        </p>
        <FactSourceText
          source={{
            quote: p.quote,
            from: fr.dealCalls.proposals.from(
              p.callTitle,
              formatInstantDay(p.callAt),
            ),
            href: routes.call(p.callId),
          }}
        />
        {canWrite && (
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Button
              size="sm"
              disabled={pending}
              onClick={() =>
                run(() =>
                  setDealTerm({
                    dealId,
                    key: term.key,
                    state: p.state,
                    value: p.value,
                    proposalId: p.id,
                  }),
                )
              }
            >
              {t.apply}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                onEdit({ ...term, value: p.value, state: p.state }, p.id)
              }
            >
              {t.edit}
            </Button>
            <DismissButton dealId={dealId} id={p.id} />
          </div>
        )}
      </div>
    </section>
  );
}
