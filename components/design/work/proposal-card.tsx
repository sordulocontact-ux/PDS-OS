"use client";

import { useState } from "react";
import { toast } from "sonner";

import { useDesignAction } from "@/components/design/work/use-design-action";
import { IntentionComposer } from "@/components/design/work/intention-composer";
import { OptionSelect } from "@/components/framing/option-select";
import { SourceQuote } from "@/components/framing/guide/source-quote";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
import { ViewLink } from "@/components/ui/view-link";
import { reviewDesignIntention } from "@/lib/design/actions/intentions";
import { DIRECTION_KEY } from "@/lib/design/intentions";
import type { Provenance } from "@/lib/framing/brief";
import { fr } from "@/lib/i18n/fr";

export type ProposalView = {
  id: string;
  value: string;
  // The topic key (lib/design/intentions.ts), for merging and splitting.
  topic: string;
  topicLabel: string;
  provenance: Provenance;
  // The call it was heard in, when it comes from one.
  callHref: string | null;
  // Other targets fed by the same passage of the same source (code).
  alsoFor: string[];
  // A confirmed answer already exists for this topic (code).
  differs: boolean;
};

/**
 * One intention PO read in a source, to decide: confirmed as is, reworded
 * then confirmed, or set aside. `targets`: PO could not tell what it is
 * about — the person picks the target first.
 */
export function ProposalCard({
  projectId,
  proposal,
  canWrite,
  targets,
}: {
  projectId: string;
  proposal: ProposalView;
  canWrite: boolean;
  targets?: Record<string, string>;
}) {
  const t = fr.conceptionWork.proposals;
  const { pending, run } = useDesignAction();
  const [editing, setEditing] = useState(false);
  const [target, setTarget] = useState("");
  const selectId = `design-proposal-target-${proposal.id}`;

  const accept = (text?: string) => {
    if (targets && !target) {
      toast.error(fr.conceptionWork.unassigned.targetRequired);
      return;
    }
    const chosen = !targets
      ? undefined
      : target === DIRECTION_KEY
        ? ({ kind: "direction" } as const)
        : ({ kind: "deliverable", id: target } as const);
    run(
      () => reviewDesignIntention(proposal.id, projectId, true, chosen, text),
      { success: t.confirmed, onSuccess: () => setEditing(false) },
    );
  };

  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-border p-4">
      <div className="flex flex-wrap items-center gap-2">
        {/* A suggestion of PO, never shown as a decision (ticket, IA et provenance). */}
        <StatusBadge tone="info" size="sm">
          {fr.conceptionIntents.consolidation.poProposal}
        </StatusBadge>
        <StatusBadge tone="action" size="sm">
          {proposal.topicLabel}
        </StatusBadge>
      </div>
      {editing ? (
        <IntentionComposer
          id={`design-proposal-${proposal.id}`}
          defaultValue={proposal.value}
          pending={pending}
          submitLabel={t.confirmEdited}
          onSubmit={(text) => accept(text)}
          secondary={
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEditing(false)}
            >
              {t.cancel}
            </Button>
          }
        />
      ) : (
        <p className="text-body-md font-semibold break-words">
          {proposal.value}
        </p>
      )}
      <div className="text-caption text-muted-foreground">
        <SourceQuote provenance={proposal.provenance} />
        {proposal.callHref && (
          <ViewLink
            href={proposal.callHref}
            className="mt-1 inline-block underline underline-offset-2"
          >
            {t.openCall}
          </ViewLink>
        )}
      </div>
      {proposal.alsoFor.length > 0 && (
        <ToneCallout tone="info">
          {t.alsoFor(proposal.alsoFor.join(", "))}
        </ToneCallout>
      )}
      {proposal.differs && (
        <ToneCallout tone="warning">{t.differs}</ToneCallout>
      )}

      {canWrite && targets && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={selectId}>
            {fr.conceptionWork.unassigned.targetLabel}
          </Label>
          <OptionSelect
            id={selectId}
            label={fr.conceptionWork.unassigned.targetLabel}
            options={{
              "": fr.conceptionWork.unassigned.targetPlaceholder,
              ...targets,
            }}
            value={target}
            onChange={setTarget}
            disabled={pending}
            required
          />
        </div>
      )}
      {canWrite && !editing && (
        <div className="flex flex-wrap gap-2">
          <Button disabled={pending} onClick={() => accept()}>
            {t.confirm}
          </Button>
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => setEditing(true)}
          >
            {t.edit}
          </Button>
          <Button
            variant="ghost"
            disabled={pending}
            onClick={() =>
              run(() => reviewDesignIntention(proposal.id, projectId, false), {
                success: t.rejected,
              })
            }
          >
            {t.reject}
          </Button>
        </div>
      )}
    </article>
  );
}
