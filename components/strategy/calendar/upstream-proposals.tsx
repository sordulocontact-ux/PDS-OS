"use client";

import { useState } from "react";
import { toast } from "@/components/ui/toast";

import { useFramingAction } from "@/components/framing/use-framing-action";
import { formatMilestoneDate } from "@/components/strategy/calendar/milestone-row";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DialogButton } from "@/components/ui/dialog-button";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { strategyCalendar } from "@/lib/i18n/fr/strategy-calendar";
import { addUpstreamMilestones } from "@/lib/strategy/actions/plan";
import type { UpstreamMilestone } from "@/lib/strategy/upstream";

const fr = { dialogs, strategyCalendar };

/**
 * « Proposer les jalons amont » (MKT-S1-10): the delivery and validation a
 * deliverable calls for, dated by code from its lead times, ticked by a
 * person and created at once, each tied to the deliverable.
 */
export function UpstreamProposals({
  projectId,
  proposals,
}: {
  projectId: string;
  proposals: UpstreamMilestone[];
}) {
  const t = fr.strategyCalendar.upstream.proposals;
  if (proposals.length === 0) return null;
  return (
    <DialogButton
      label={t.button}
      size="xs"
      title={t.title(proposals[0].deliverableTitle)}
      description={t.description}
    >
      {(close) => (
        <ProposalsForm
          projectId={projectId}
          proposals={proposals}
          onDone={close}
        />
      )}
    </DialogButton>
  );
}

function ProposalsForm({
  projectId,
  proposals,
  onDone,
}: {
  projectId: string;
  proposals: UpstreamMilestone[];
  onDone: () => void;
}) {
  const t = fr.strategyCalendar.upstream.proposals;
  const { pending, run } = useFramingAction();
  const [on, setOn] = useState(proposals.map(() => true));
  const chosen = proposals.filter((_, i) => on[i]);
  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-2">
        {proposals.map((p, i) => (
          <li key={p.kind} className="flex items-center gap-3 text-sm">
            <Checkbox
              checked={on[i]}
              aria-label={t.label(p.kind, p.deliverableTitle)}
              onChange={() =>
                setOn((all) => all.map((v, j) => (j === i ? !v : v)))
              }
            />
            <span className="flex-1">
              {t.label(p.kind, p.deliverableTitle)}
            </span>
            <span className="text-[color:var(--text-secondary)] tabular-nums">
              {formatMilestoneDate(p.date)}
            </span>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="ghost" size="lg" onClick={onDone}>
          {fr.dialogs.cancel}
        </Button>
        <Button
          size="lg"
          disabled={pending || chosen.length === 0}
          onClick={() =>
            run(
              () =>
                addUpstreamMilestones(
                  projectId,
                  chosen.map((p) => ({
                    kind: p.kind,
                    title: t.label(p.kind, p.deliverableTitle),
                    occursOn: p.date,
                    deliverableId: p.deliverableId,
                  })),
                ),
              () => {
                toast.success(t.created(chosen.length));
                onDone();
              },
            )
          }
        >
          {pending ? fr.dialogs.saving : t.create(chosen.length)}
        </Button>
      </div>
    </div>
  );
}
