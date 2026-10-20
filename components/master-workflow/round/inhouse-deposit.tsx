import { DeliverVersion } from "@/components/master-workflow/deliver-version";
import { fr } from "@/lib/i18n/fr";
import type { RoundStepView } from "@/lib/master-workflow/round-step";

/**
 * « Déposer ma version » for the in-house engineer, in the app (proto
 * `master:hugo`): per title whose latest version is missing, to change or
 * reopened; filed in the title at the Catalogue, the versions follow.
 */
export function InHouseDeposit({ round }: { round: RoundStepView }) {
  const label = fr.masterJourney.versionLabel[round.stage];
  const several = round.versions.titles.length > 1;
  return (
    <div className="flex flex-col gap-3">
      {round.versions.titles.map((title) => {
        const [latest] = title.versions;
        const open =
          title.finalNumber === null &&
          (!latest ||
            latest.decision === "changes_requested" ||
            Boolean(round.extras[latest.id]?.reopenedAt));
        if (!open) return null;
        const n = (latest?.number ?? 0) + 1;
        return (
          <DeliverVersion
            key={title.masterId}
            token=""
            masterId={title.masterId}
            role={round.stage}
            member={{
              projectId: round.view.projectId,
              label: `${fr.masterInHouse.deposit(label, n)}${several ? ` · « ${title.title} »` : ""}`,
            }}
          />
        );
      })}
    </div>
  );
}
