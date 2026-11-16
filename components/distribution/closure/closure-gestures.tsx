"use client";

import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import {
  ReserveFields,
  draftErrors,
  draftOf,
  type ReserveDraft,
} from "@/components/distribution/closure/reserve-fields";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { DecisionPanel } from "@/components/ui/decision-panel";
import { ToneCallout } from "@/components/ui/tone-callout";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { VersionCard } from "@/components/ui/version-card";
import {
  decideClosure,
  proposeClosure,
  reopenClosure,
} from "@/lib/distribution/closure-gestures";
import {
  isReasonKind,
  type ReasonKind,
  type Reserve,
} from "@/lib/distribution/closure";
import { distribution } from "@/lib/i18n/fr/distribution";
import { distributionJourney } from "@/lib/i18n/fr/distribution-journey";
import { todayInParis } from "@/lib/insights/dates";
import { useDistributionRelease } from "@/components/distribution/frame/release-scope";

const fr = { distribution, distributionJourney };

const t = fr.distributionJourney.closure;
const c = fr.distribution.closure;

/** « Proposer une clôture normale », or with reserves: who follows each
 * one, by when, with what proof; before The Orchard accepted, a reason of
 * the direction; the arbitration and the acknowledgement — each in red with
 * its reason after a first try. */
export function ProposeClosure({
  projectId,
  reserves,
  accepted,
  members,
  ownerPersonId,
  validator,
  direction,
}: {
  projectId: string;
  reserves: Reserve[];
  accepted: boolean;
  members: Array<{ personId: string; name: string }>;
  ownerPersonId: string | null;
  validator: string;
  direction: string;
}) {
  const releaseId = useDistributionRelease();
  const [drafts, setDrafts] = useState<ReserveDraft[]>(() =>
    reserves.map((r) => draftOf(r, ownerPersonId)),
  );
  const [reasonKind, setReasonKind] = useState<ReasonKind | null>(null);
  const [arbitration, setArbitration] = useState("");
  const [ack, setAck] = useState(false);
  const [tried, setTried] = useState(false);
  const n = reserves.length;
  const done = n ? t.proposedReserves(n) : t.proposedNormal;
  const { pending, error, run } = useWriteSubmit(() => setTried(false), done);
  const today = todayInParis();
  const early = n > 0 && !accepted;
  const submit = () => {
    setTried(true);
    if (n) {
      const lacking =
        !arbitration.trim() ||
        !ack ||
        (early && !reasonKind) ||
        drafts.some((d) => Object.values(draftErrors(d, today)).some(Boolean));
      if (lacking) return;
    }
    run(() =>
      proposeClosure({
        projectId,
        releaseId,
        kind: n ? "reserves" : "normal",
        arbitration: arbitration.trim(),
        acknowledged: ack,
        reasonKind: early ? reasonKind : null,
        reserves: n
          ? drafts.map((d) => ({ ...d, expectedProof: d.expectedProof.trim() }))
          : [],
        done,
      }),
    );
  };
  return (
    <div className="flex flex-col gap-3">
      {n > 0 && (
        <>
          {drafts.map((draft, i) => (
            <ReserveFields
              key={draft.cause}
              reserve={reserves[i]}
              draft={draft}
              members={members}
              today={today}
              tried={tried}
              onChange={(next) =>
                setDrafts((all) => all.map((d, j) => (j === i ? next : d)))
              }
            />
          ))}
          {early && (
            <>
              <ToneCallout tone="warning">{t.early(direction)}</ToneCallout>
              <OptionSelect
                name="closure-reason-kind"
                label={t.reasonKind}
                required
                items={c.reasonKinds}
                onValueChange={(value) =>
                  setReasonKind(isReasonKind(value) ? value : null)
                }
                error={tried && !reasonKind ? t.reasonKindRequired : undefined}
              />
            </>
          )}
          <TextareaField
            name="arbitration"
            label={t.arbitration}
            required
            rows={3}
            maxLength={2000}
            value={arbitration}
            onChange={(e) => setArbitration(e.target.value)}
            error={
              tried && !arbitration.trim()
                ? t.arbitrationRequired(early ? direction : validator)
                : undefined
            }
          />
          <CheckboxField
            name="acknowledge"
            label={t.acknowledge}
            checked={ack}
            onChange={setAck}
          />
          {tried && !ack && (
            <FormMessage kind="error">{t.acknowledgeRequired}</FormMessage>
          )}
        </>
      )}
      <FormMessage kind="error">{error}</FormMessage>
      <div>
        <Button
          disabled={pending}
          aria-busy={pending || undefined}
          onClick={submit}
        >
          {n ? t.proposeReserves : t.proposeNormal}
        </Button>
      </div>
    </div>
  );
}

export function DecideClosure({
  projectId,
  closureId,
  owner,
}: {
  projectId: string;
  closureId: string;
  owner: string;
}) {
  const releaseId = useDistributionRelease();
  return (
    <DecisionPanel
      id="closure-decision"
      title={null}
      commentLabel={t.reason}
      commentHint={t.reasonHint(owner)}
      outcomes={[
        { kind: "approve", label: t.approve, done: t.approved },
        { kind: "refuse", label: t.refuse, done: t.refused(owner) },
      ]}
      onDecide={(kind, comment) =>
        decideClosure({
          projectId,
          releaseId,
          closureId,
          approve: kind === "approve",
          note: comment,
          done: kind === "approve" ? t.approved : t.refused(owner),
        })
      }
    />
  );
}

export function ReopenClosure({ projectId }: { projectId: string }) {
  const releaseId = useDistributionRelease();
  const [note, setNote] = useState("");
  const [missing, setMissing] = useState(false);
  const { pending, error, run } = useWriteSubmit(() => setNote(""), t.reopened);
  return (
    <VersionCard title={t.reopen}>
      <TextareaField
        name="reopen"
        label={t.reopenNote}
        required
        rows={2}
        maxLength={2000}
        hint={t.reopenHint}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        error={missing ? t.reopenRequired : undefined}
      />
      <FormMessage kind="error">{error}</FormMessage>
      <div>
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => {
            const lacking = !note.trim();
            setMissing(lacking);
            if (!lacking)
              run(() =>
                reopenClosure({ projectId, releaseId, note: note.trim() }),
              );
          }}
        >
          {t.reopenButton}
        </Button>
      </div>
    </VersionCard>
  );
}
