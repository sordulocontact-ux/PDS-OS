"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { ToneCallout } from "@/components/ui/tone-callout";
import { fr } from "@/lib/i18n/fr";
import { advanceClearance } from "@/lib/legal/clearance/actions";
import {
  counterClearanceTerms,
  recordClearanceRefusal,
  submitClearanceReply,
  validateClearanceTerms,
} from "@/lib/legal/clearance/flow-actions";
import {
  readClearanceMessage,
  type MessageProposal,
} from "@/lib/legal/clearance/interpret";
import type { Clearance } from "@/lib/legal/clearance/types";

import {
  centsOf,
  eurosOf,
  firstBadAmount,
  TermsLinesEditor,
  TermsSummary,
  type TermsLine,
} from "@/components/legal/clearance/terms-lines";
import { useLegalAction } from "@/components/legal/use-legal-action";
import { formatInstant } from "@/lib/utils/instant";

// What PO read, line by line (one per right), as the person may correct it.
type Reading = { refusal: boolean; lines: TermsLine[] };

const EMPTY_LINE: TermsLine = {
  right: null,
  amount: "",
  share: "",
  credits: "",
  territory: "",
  duration: "",
};

function readingOf(proposal: MessageProposal): Reading {
  const lines = proposal.terms.map((t) => ({
    right: t.right,
    amount: eurosOf(t.amountCents),
    share: t.share ?? "",
    credits: t.credits ?? "",
    territory: t.territory ?? "",
    duration: t.duration ?? "",
  }));
  return {
    refusal: proposal.event === "refusal",
    lines: lines.length ? lines : [EMPTY_LINE],
  };
}

/** « Négocier »: their answer pasted, read by PO, corrected, sent to the
 * direction; the direction validates (which prepares the contract) or asks
 * for a counter-proposal; a refusal is said here. */
export function NegotiateMoment({
  projectId,
  clearance,
  canValidate,
}: {
  projectId: string;
  clearance: Clearance;
  canValidate: boolean;
}) {
  const t = fr.legalClearance.flow;
  const { pending, run } = useLegalAction();
  const [reply, setReply] = useState("");
  const [reading, setReading] = useState<Reading | null>(null);
  const [tried, setTried] = useState(false);
  // Lines whose amount is not one, at the last « Envoyer à la direction ».
  const [badAmounts, setBadAmounts] = useState<ReadonlySet<number>>(new Set());
  const [reads, startReading] = useTransition();

  const proposed = clearance.terms.filter((x) => x.status === "proposed");
  const countered = clearance.terms.some((x) => x.status === "rejected");
  const lastIn = clearance.exchanges.find((e) => e.direction === "in");
  const names = clearance.holders.map((h) => h.name).join(" et ");
  const askedOn = clearance.exchanges.find((e) => e.direction === "out")?.at;

  if (clearance.status === "refused" || clearance.status === "action_required")
    return (
      <>
        <ToneCallout tone="danger">
          <span className="font-medium">{t.refused}</span> — {t.refusedBody}
        </ToneCallout>
        {lastIn && (
          <blockquote className="border-l-2 pl-3 text-sm break-words text-muted-foreground">
            « {lastIn.body} »
          </blockquote>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={pending}
            onClick={() =>
              run(() =>
                advanceClearance({
                  projectId,
                  clearanceId: clearance.id,
                  status: clearance.next ?? "contacted",
                  note: "",
                }),
              )
            }
          >
            {t.resume}
          </Button>
        </div>
      </>
    );

  // Conditions proposed: the direction's decision, on every line at once.
  if (proposed.length > 0) {
    const termsIds = proposed.map((x) => x.id);
    const box = (
      <div className="flex flex-col gap-2 rounded-xl border bg-card p-4">
        <span className="text-sm text-muted-foreground">{t.termsRead}</span>
        <TermsSummary terms={proposed} />
        {lastIn && (
          <blockquote className="border-l-2 pl-3 text-sm break-words text-muted-foreground">
            « {lastIn.body} »
          </blockquote>
        )}
      </div>
    );
    if (!canValidate)
      return (
        <>
          {box}
          <div className="flex flex-col gap-1 rounded-xl bg-muted p-4">
            <span className="text-caption font-medium tracking-wide text-muted-foreground uppercase">
              {t.atDirection}
            </span>
            <span className="text-sm">{t.atDirectionBody}</span>
          </div>
        </>
      );
    return (
      <>
        {box}
        <p className="text-sm text-muted-foreground">{t.validateNote}</p>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={pending}
            onClick={() =>
              run(() =>
                validateClearanceTerms({
                  projectId,
                  clearanceId: clearance.id,
                  termsIds,
                }),
              )
            }
          >
            {t.validate}
          </Button>
          <Button
            variant="ghost"
            disabled={pending}
            onClick={() =>
              run(() =>
                counterClearanceTerms({
                  projectId,
                  clearanceId: clearance.id,
                  termsIds,
                }),
              )
            }
          >
            {t.counter}
          </Button>
        </div>
      </>
    );
  }

  const read = () => {
    if (!reply.trim()) {
      setTried(true);
      return;
    }
    startReading(async () => {
      const result = await readClearanceMessage(projectId, clearance.id, reply);
      if (!result.ok) return void toast.error(result.error);
      setReading(readingOf(result.proposal));
    });
  };

  return (
    <>
      {countered && <ToneCallout tone="neutral">{t.countered}</ToneCallout>}
      <p className="text-sm text-muted-foreground">
        {t.askedTo(
          names || fr.legalClearance.flow.holdersFallback,
          askedOn ? formatInstant(askedOn) : "",
        )}
      </p>
      {reading === null ? (
        <>
          <TextareaField
            name={`reply-${clearance.id}`}
            label={t.replyLabel}
            aria-required
            placeholder={t.replyPlaceholder}
            rows={4}
            maxLength={8000}
            value={reply}
            onChange={(event) => setReply(event.target.value)}
            error={tried && !reply.trim() ? t.replyMissing : undefined}
          />
          <Button
            variant="outline"
            className="self-start"
            disabled={reads}
            aria-busy={reads || undefined}
            onClick={read}
          >
            {reads ? t.reading : t.read}
          </Button>
        </>
      ) : reading.refusal ? (
        <>
          <div className="flex flex-col gap-2 rounded-xl border bg-card p-4">
            <span className="text-sm text-muted-foreground">
              {t.understood}
            </span>
            <span className="font-medium">{t.refusal}</span>
            <blockquote className="border-l-2 pl-3 text-sm break-words text-muted-foreground">
              « {reply} »
            </blockquote>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={pending}
              onClick={() =>
                run(() =>
                  recordClearanceRefusal({
                    projectId,
                    clearanceId: clearance.id,
                    body: reply,
                  }),
                )
              }
            >
              {t.recordRefusal}
            </Button>
            <Button variant="ghost" onClick={() => setReading(null)}>
              {t.notThat}
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
            <span className="text-sm text-muted-foreground">
              {t.understood}
            </span>
            <TermsLinesEditor
              clearanceId={clearance.id}
              lines={reading.lines}
              badAmounts={badAmounts}
              onChange={(lines) => {
                setBadAmounts(new Set());
                setReading({ ...reading, lines });
              }}
            />
            <blockquote className="border-l-2 pl-3 text-sm break-words text-muted-foreground">
              « {reply} »
            </blockquote>
            <span className="text-sm text-muted-foreground">{t.verbatim}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={pending}
              onClick={() => {
                const bad = reading.lines.flatMap((line, i) =>
                  centsOf(line.amount) === undefined ? [i] : [],
                );
                if (bad.length > 0) {
                  setBadAmounts(new Set(bad));
                  firstBadAmount(clearance.id, reading.lines);
                  return;
                }
                run(() =>
                  submitClearanceReply({
                    projectId,
                    clearanceId: clearance.id,
                    body: reply,
                    terms: reading.lines.map((line) => ({
                      right: line.right,
                      amountCents: centsOf(line.amount) ?? null,
                      share: line.share,
                      credits: line.credits,
                      territory: line.territory,
                      duration: line.duration,
                    })),
                  }),
                );
              }}
            >
              {t.toDirection}
            </Button>
            <Button variant="ghost" onClick={() => setReading(null)}>
              {t.notThat}
            </Button>
          </div>
        </>
      )}
    </>
  );
}
