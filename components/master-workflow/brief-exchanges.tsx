"use client";

import { useState, useTransition } from "react";

import { CallStatusBadge } from "@/components/calls/call-badges";
import {
  toBriefItem,
  useApplyBrief,
} from "@/components/master-workflow/use-apply-brief";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableLink,
  DataTableRow,
} from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { DictationReview } from "@/components/voice/dictation-review";
import { formatDateTime } from "@/lib/calls/format";
import { facts } from "@/lib/i18n/fr/facts";
import { masterWorkflow } from "@/lib/i18n/fr/master-workflow";
import { voice } from "@/lib/i18n/fr/voice";
import type { BriefProposal } from "@/lib/master-workflow/brief-proposals";
import type { BriefExchange } from "@/lib/master-workflow/brief-types";
import { proposeBriefFromCall } from "@/lib/master-workflow/exchange-actions";
import type { VoiceErrorCode } from "@/lib/voice/constants";

const fr = { voice, facts, masterWorkflow };

type Phase =
  | { name: "idle" }
  | { name: "sending"; callId: string }
  | { name: "review"; heard: string; proposals: BriefProposal[] }
  | { name: "error"; error: VoiceErrorCode };

/**
 * The exchanges of the brief: each call, its state, and for the owner, once
 * it is transcribed, "Proposer pour le Brief": what was said, reviewed like
 * a dictation (kept or dropped one by one), then written into the brief.
 */
export function BriefExchanges({
  projectId,
  exchanges,
  canEdit,
}: {
  projectId: string;
  exchanges: BriefExchange[];
  canEdit: boolean;
}) {
  const t = fr.masterWorkflow.brief.exchanges;
  const [phase, setPhase] = useState<Phase>({ name: "idle" });
  const [, startTransition] = useTransition();
  const { pending, apply } = useApplyBrief(projectId);
  const reset = () => setPhase({ name: "idle" });

  const propose = (callId: string) => {
    setPhase({ name: "sending", callId });
    startTransition(async () => {
      const answer = await proposeBriefFromCall(projectId, callId).catch(
        () => ({ ok: false, error: "provider_error" }) as const,
      );
      setPhase(
        answer.ok
          ? { name: "review", heard: answer.heard, proposals: answer.proposals }
          : { name: "error", error: answer.error },
      );
    });
  };
  const busy = phase.name === "sending";

  return (
    <div className="grid gap-4">
      <DataTable>
        <DataTableHeader>
          <DataTableHead icon="call" fill>
            {t.columns.call}
          </DataTableHead>
          <DataTableHead icon="date" hideBelow="sm">
            {t.columns.date}
          </DataTableHead>
          <DataTableHead icon="status" align={canEdit ? "start" : "end"}>
            {t.columns.state}
          </DataTableHead>
          {canEdit && (
            <DataTableHead align="end" className="w-px">
              <span className="sr-only">{fr.facts.columns.actions}</span>
            </DataTableHead>
          )}
        </DataTableHeader>
        <DataTableBody>
          {exchanges.map((exchange) => (
            <DataTableRow key={exchange.callId}>
              <DataTableCell fill className="max-w-0">
                <DataTableLink href={exchange.href}>
                  {exchange.title}
                </DataTableLink>
              </DataTableCell>
              <DataTableCell
                hideBelow="sm"
                className="text-[color:var(--text-secondary)] tabular-nums"
              >
                {formatDateTime(exchange.occurredAt)}
              </DataTableCell>
              <DataTableCell align={canEdit ? "start" : "end"}>
                <CallStatusBadge status={exchange.status} />
              </DataTableCell>
              {canEdit && (
                <DataTableCell align="end" className="w-px whitespace-nowrap">
                  {exchange.canPropose && (
                    <Button
                      variant="outline"
                      size="xs"
                      className="relative z-10"
                      disabled={busy}
                      aria-busy={
                        (phase.name === "sending" &&
                          phase.callId === exchange.callId) ||
                        undefined
                      }
                      onClick={() => propose(exchange.callId)}
                    >
                      {t.propose}
                    </Button>
                  )}
                </DataTableCell>
              )}
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>

      {phase.name === "sending" && (
        <div aria-live="polite">
          <StatusBadge tone="info" dot>
            {t.analysing}
          </StatusBadge>
        </div>
      )}
      {phase.name === "error" && (
        <div role="alert" className="flex flex-wrap items-center gap-3 text-sm">
          {fr.voice.errors[phase.error]}
          <Button size="sm" variant="ghost" onClick={reset}>
            {fr.voice.cancel}
          </Button>
        </div>
      )}
      {phase.name === "review" && (
        <ReviewPanel
          heard={phase.heard}
          proposals={phase.proposals}
          pending={pending}
          onApply={(kept) => apply(kept, reset)}
          onDiscard={reset}
        />
      )}
    </div>
  );
}

function ReviewPanel({
  heard,
  proposals,
  pending,
  onApply,
  onDiscard,
}: {
  heard: string;
  proposals: BriefProposal[];
  pending: boolean;
  onApply: (kept: BriefProposal[]) => void;
  onDiscard: () => void;
}) {
  const items = proposals.map(toBriefItem);
  return (
    <DictationReview
      heard={heard}
      items={items}
      pending={pending}
      onApply={(ids) =>
        onApply(items.filter((i) => ids.includes(i.id)).map((i) => i.proposal))
      }
      onDiscard={onDiscard}
    />
  );
}
