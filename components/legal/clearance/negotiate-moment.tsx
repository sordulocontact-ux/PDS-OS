"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Field } from "@/components/auth/field";
import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { ToneCallout } from "@/components/ui/tone-callout";
import { fr } from "@/lib/i18n/fr";
import { parseEurosToCents } from "@/lib/projects/schemas";
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
import { formatFee } from "@/lib/legal/contracts/fields";
import { formatDate } from "@/lib/release/format";

import { useLegalAction } from "@/components/legal/use-legal-action";

// What PO read, as the person may correct it before it goes to the
// direction: the amount in euros as typed, the rest as written.
type Reading = {
  refusal: boolean;
  amount: string;
  share: string;
  credits: string;
  territory: string;
  duration: string;
};

const euros = (cents: number | null) =>
  cents === null ? "" : String(cents / 100).replace(".", ",");
// « 2 000 € HT », « 2000,50 »… → cents; null when empty, undefined when
// it is not an amount: then said on the field, never sent as "no amount"
// (UX test of 09/10/2026: an advance of 2 000 € vanished before the DG).
const cents = (amount: string) =>
  parseEurosToCents(amount.replace(/\b(HT|TTC)\b/gi, ""));

function readingOf(proposal: MessageProposal): Reading {
  const t = proposal.terms;
  return {
    refusal: proposal.event === "refusal",
    amount: euros(t?.amountCents ?? null),
    share: t?.share ?? "",
    credits: t?.credits ?? "",
    territory: t?.territory ?? "",
    duration: t?.duration ?? "",
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
  const [amountError, setAmountError] = useState(false);
  const [reads, startReading] = useTransition();

  const proposed = clearance.terms.find((x) => x.status === "proposed");
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

  // Conditions proposed: the direction's decision.
  if (proposed) {
    const box = (
      <div className="flex flex-col gap-2 rounded-xl border bg-card p-4">
        <span className="text-sm text-muted-foreground">{t.termsRead}</span>
        <span className="font-medium break-words">
          {[
            proposed.amountCents !== null
              ? formatFee(proposed.amountCents)
              : null,
            proposed.share,
            proposed.credits,
            proposed.territory,
            proposed.duration,
          ]
            .filter(Boolean)
            .join(" · ") || "—"}
        </span>
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
                  termsId: proposed.id,
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
                  termsId: proposed.id,
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
          askedOn ? formatDate(askedOn) : "",
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
            <div className="grid gap-3 sm:grid-cols-3">
              <Field
                name={`amount-${clearance.id}`}
                label={t.amount}
                inputMode="decimal"
                suffix="€"
                value={reading.amount}
                error={amountError ? t.amountInvalid : undefined}
                onChange={(event) => {
                  setAmountError(false);
                  setReading({ ...reading, amount: event.target.value });
                }}
              />
              <Field
                name={`share-${clearance.id}`}
                label={t.share}
                value={reading.share}
                onChange={(event) =>
                  setReading({ ...reading, share: event.target.value })
                }
              />
              <Field
                name={`credits-${clearance.id}`}
                label={t.credits}
                value={reading.credits}
                onChange={(event) =>
                  setReading({ ...reading, credits: event.target.value })
                }
              />
            </div>
            <blockquote className="border-l-2 pl-3 text-sm break-words text-muted-foreground">
              « {reply} »
            </blockquote>
            <span className="text-sm text-muted-foreground">{t.verbatim}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={pending}
              onClick={() => {
                const amountCents = cents(reading.amount);
                if (amountCents === undefined) {
                  setAmountError(true);
                  document
                    .getElementsByName(`amount-${clearance.id}`)[0]
                    ?.focus();
                  return;
                }
                run(() =>
                  submitClearanceReply({
                    projectId,
                    clearanceId: clearance.id,
                    body: reply,
                    terms: {
                      amountCents,
                      share: reading.share,
                      credits: reading.credits,
                      territory: reading.territory,
                      duration: reading.duration,
                    },
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
