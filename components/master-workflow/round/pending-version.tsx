import { ToneCallout } from "@/components/ui/tone-callout";
import { fr } from "@/lib/i18n/fr";
import type { MixVersion } from "@/lib/master-workflow/mix-types";
import type { RoundStepView } from "@/lib/master-workflow/round-step";

import { VersionDecision } from "./version-decision";
import { VersionFeedback } from "./version-feedback";

const t = fr.masterRound;

/**
 * Under the latest version, still undecided: the feedback, then the
 * validator's decision, or who is awaited.
 */
export function PendingVersion({
  round,
  version,
  engineer,
  viewerIsOwner,
}: {
  round: RoundStepView;
  version: MixVersion;
  engineer: string;
  viewerIsOwner: boolean;
}) {
  const label = fr.masterJourney.versionLabel[round.stage];
  const extra = round.extras[version.id];
  return (
    <>
      {extra?.working && (
        <ToneCallout tone="warning">
          {t.decision.working(extra.source ?? "")}
        </ToneCallout>
      )}
      <VersionFeedback
        projectId={round.view.projectId}
        label={label}
        version={version}
        engineer={engineer}
        validator={round.validator ?? "—"}
        canTransmit={
          viewerIsOwner && !round.versions.canDecide && !version.feedbackSentAt
        }
      />
      {round.versions.canDecide ? (
        <VersionDecision
          projectId={round.view.projectId}
          versionId={version.id}
          label={label}
          engineer={engineer}
          working={extra?.working ?? false}
        />
      ) : (
        <ToneCallout tone="info">
          {t.decision.waiting(round.validator ?? "—", label, version.number)}
        </ToneCallout>
      )}
    </>
  );
}
