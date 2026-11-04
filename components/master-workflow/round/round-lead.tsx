import { masterRound } from "@/lib/i18n/fr/master-round";
import type { MixVersion } from "@/lib/master-workflow/mix-types";
import type { RoundStepView } from "@/lib/master-workflow/round-step";

import { PendingVersion } from "./pending-version";

const fr = { masterRound };

/**
 * The versions the viewer decides now: the latest of each title, undecided
 * and not reopened, when the viewer is the validator. Empty: no lead.
 */
export function leadVersionsOf(round: RoundStepView): MixVersion[] {
  if (!round.versions.canDecide) return [];
  return round.versions.titles.flatMap((title) => {
    const [latest] = title.versions;
    return latest &&
      latest.decision === null &&
      !round.extras[latest.id]?.reopenedAt
      ? [latest]
      : [];
  });
}

/**
 * « À vous · Valider le Mix V1 » at the head of the Mixage or the
 * Mastering (lot 4 of Ibé's feedback, Nadia's answer): the version to
 * listen to, its feedback and the decision, nothing before them. The older
 * versions, the rate, the link and the thread stay below, folded
 * (RoundStep `lead`).
 */
export function RoundLead({
  round,
  versions,
  engineer,
  viewerIsOwner,
}: {
  round: RoundStepView;
  versions: MixVersion[];
  engineer: string;
  viewerIsOwner: boolean;
}) {
  const several = round.versions.titles.length > 1;
  return (
    <div className="flex flex-col gap-5">
      {versions.map((version) => {
        const title = round.versions.titles.find(
          (x) => x.masterId === version.masterId,
        );
        return (
          <div key={version.id} className="flex flex-col gap-3">
            {several && title && (
              <p className="text-[length:var(--type-body-sm)] font-semibold">
                {fr.masterRound.lead.title(title.title)}
              </p>
            )}
            <PendingVersion
              round={round}
              version={version}
              previous={title?.versions[1] ?? null}
              engineer={engineer}
              viewerIsOwner={viewerIsOwner}
            />
          </div>
        );
      })}
    </div>
  );
}
