"use client";

import { useState } from "react";

import { sourceLabel } from "@/components/framing/guide/source-quote";
import { OptionSelect } from "@/components/framing/option-select";
import { Label } from "@/components/ui/label";
import { ProposalRow } from "@/components/ui/proposal-row";
import { ToneCallout } from "@/components/ui/tone-callout";
import { VoiceFieldControl } from "@/components/voice/voice-field-control";
import { reviewDesignIntention } from "@/lib/design/actions/intentions";
import { DIRECTION_KEY } from "@/lib/design/intentions";
import type { Provenance } from "@/lib/framing/brief";
import { conceptionWork } from "@/lib/i18n/fr/conception-work";

const fr = { conceptionWork };

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
 * One intention PO read in a source, as a `ProposalRow`: confirmed as is,
 * reworded then confirmed (dictation in the field), or set aside.
 * `targets`: PO could not tell what it is about — the person picks the
 * target first. `extraActions`: « Séparer ».
 */
export function ConceptionProposalRow({
  projectId,
  proposal,
  canWrite,
  targets,
  leading,
  extraActions,
  confirmInGroup = false,
}: {
  projectId: string;
  proposal: ProposalView;
  canWrite: boolean;
  targets?: Record<string, string>;
  leading?: React.ReactNode;
  extraActions?: React.ReactNode;
  // Confirmed with its section (« Confirmer les n »): the row only offers
  // « Modifier » / « Écarter ».
  confirmInGroup?: boolean;
}) {
  const t = fr.conceptionWork.proposals;
  const [target, setTarget] = useState("");
  const selectId = `design-proposal-target-${proposal.id}`;
  const quote = proposal.provenance.quote;

  const accept = async (text?: string) => {
    if (targets && !target)
      return {
        ok: false as const,
        error: fr.conceptionWork.unassigned.targetRequired,
      };
    const chosen = !targets
      ? undefined
      : target === DIRECTION_KEY
        ? ({ kind: "direction" } as const)
        : ({ kind: "deliverable", id: target } as const);
    return reviewDesignIntention(proposal.id, projectId, true, chosen, text);
  };

  return (
    <ProposalRow
      proposal={{
        id: proposal.id,
        text: proposal.value,
        context: proposal.topicLabel,
        quote: quote || null,
        from: sourceLabel(proposal.provenance),
        href: proposal.callHref,
        state: "proposed",
      }}
      canEdit={canWrite}
      onConfirm={accept}
      onDiscard={() => reviewDesignIntention(proposal.id, projectId, false)}
      leading={leading}
      extraActions={extraActions}
      confirmInGroup={confirmInGroup}
      editAddon={(fieldId) => <VoiceFieldControl fieldId={fieldId} />}
      messages={{
        confirmed: t.confirmed,
        saved: t.confirmed,
        discarded: t.rejected,
      }}
    >
      {proposal.alsoFor.length > 0 && (
        <ToneCallout tone="info" className="mt-2">
          {t.alsoFor(proposal.alsoFor.join(", "))}
        </ToneCallout>
      )}
      {proposal.differs && (
        <ToneCallout tone="warning" className="mt-2">
          {t.differs}
        </ToneCallout>
      )}
      {canWrite && targets && (
        <div className="mt-2 flex flex-col gap-1.5">
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
            required
          />
        </div>
      )}
    </ProposalRow>
  );
}
