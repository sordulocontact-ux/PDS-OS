"use client";

import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { DecisionPanel } from "@/components/ui/decision-panel";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { VersionCard } from "@/components/ui/version-card";
import {
  decideClosure,
  proposeClosure,
  reopenClosure,
} from "@/lib/distribution/closure-gestures";
import { fr } from "@/lib/i18n/fr";

const t = fr.distributionJourney.closure;

/** « Proposer une clôture normale », or with reserves: the arbitration and
 * the acknowledgement asked, in red after a first try. */
export function ProposeClosure({
  projectId,
  reserves,
  validator,
}: {
  projectId: string;
  reserves: number;
  validator: string;
}) {
  const [arbitration, setArbitration] = useState("");
  const [ack, setAck] = useState(false);
  const [tried, setTried] = useState(false);
  const done = reserves ? t.proposedReserves(reserves) : t.proposedNormal;
  const { pending, error, run } = useWriteSubmit(() => setTried(false), done);
  const submit = () => {
    setTried(true);
    if (reserves && (!arbitration.trim() || !ack)) return;
    run(() =>
      proposeClosure({
        projectId,
        kind: reserves ? "reserves" : "normal",
        arbitration: arbitration.trim(),
        acknowledged: ack,
        done,
      }),
    );
  };
  return (
    <div className="flex flex-col gap-3">
      {reserves > 0 && (
        <>
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
                ? t.arbitrationRequired(validator)
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
          {reserves ? t.proposeReserves : t.proposeNormal}
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
              run(() => reopenClosure({ projectId, note: note.trim() }));
          }}
        >
          {t.reopenButton}
        </Button>
      </div>
    </VersionCard>
  );
}
