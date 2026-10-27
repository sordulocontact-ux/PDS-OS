import { BlockerCallout } from "@/components/ui/blocker-callout";
import { ToneCallout } from "@/components/ui/tone-callout";
import { masterJourney } from "@/lib/i18n/fr/master-journey";
import { masterRound } from "@/lib/i18n/fr/master-round";
import type { MixVersion } from "@/lib/master-workflow/mix-types";
import type { RoundStepView } from "@/lib/master-workflow/round-step";
import { masterStepHref } from "@/lib/ui/master-steps";

import { VersionDecision } from "./version-decision";
import { VersionFeedback } from "./version-feedback";

const fr = { masterJourney, masterRound };

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
        <>
          <ToneCallout tone="warning">
            {t.decision.working(extra.source ?? "")}
          </ToneCallout>
          <BlockerCallout
            blockers={[
              extra.finalVocals
                ? { text: t.decision.unblock.newMix(engineer), href: null }
                : {
                    text: t.decision.unblock.vocals,
                    href: masterStepHref(round.view.projectId, "source"),
                  },
            ]}
            then={t.decision.unblock.then(engineer)}
          />
        </>
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
