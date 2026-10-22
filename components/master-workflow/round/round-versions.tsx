import { ToneCallout } from "@/components/ui/tone-callout";
import { VersionCard } from "@/components/ui/version-card";
import { fr } from "@/lib/i18n/fr";
import type { RoundStepView } from "@/lib/master-workflow/round-step";

import { PendingVersion } from "./pending-version";
import { RoundVersionCard } from "./round-version-card";
import { ReopenMix } from "./version-decision";

const t = fr.masterRound;

type Props = {
  round: RoundStepView;
  engineer: string;
  viewerIsOwner: boolean;
  // Versions already shown at the head of the step (RoundLead): only the
  // older ones of their title are listed here.
  leadIds?: ReadonlySet<string>;
};

/**
 * « Mix · n versions » (proto): per title, the latest and the validated
 * versions open, the older ones folded; under the latest, the feedback, the
 * decision or who is awaited, and once validated « Rouvrir le mix » for the
 * owner.
 */
export function RoundVersions({
  round,
  engineer,
  viewerIsOwner,
  leadIds,
}: Props) {
  const label = fr.masterJourney.versionLabel[round.stage];
  const titles = round.versions.titles.filter((x) => x.versions.length > 0);
  const several = round.versions.titles.length > 1;
  if (titles.length === 0)
    return (
      <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
        {round.inHouse
          ? fr.masterInHouse.noVersion(engineer)
          : t.versions.none(engineer)}
      </p>
    );
  return (
    <div className="flex flex-col gap-5">
      {titles.map((title) => {
        const [latest, ...older] = title.versions;
        const inLead = leadIds?.has(latest.id) ?? false;
        if (inLead && older.length === 0) return null;
        const extra = round.extras[latest.id];
        const approved = title.versions.find((v) => v.decision === "approved");
        const card = (v: (typeof older)[number], open: boolean) => (
          <RoundVersionCard
            key={v.id}
            round={round}
            version={v}
            engineer={engineer}
            open={open}
          />
        );
        return (
          <section key={title.masterId} className="flex flex-col gap-3">
            <h3 className="text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)] font-semibold">
              {several ? `« ${title.title} » · ` : ""}
              {t.versions.title(label, title.versions.length)}
            </h3>
            <p className="-mt-2 text-[length:var(--type-caption)] text-[color:var(--text-secondary)]">
              {t.versions.hint}
            </p>
            {!inLead && card(latest, true)}
            {older.length > 0 && (
              <VersionCard title={t.versions.previous(older.length)}>
                {older.map((v) => card(v, v.id === approved?.id))}
              </VersionCard>
            )}
            {inLead ? null : approved ? (
              <>
                <ToneCallout tone="success">
                  {t.decision.final(label, approved.number, approved.decidedBy)}
                </ToneCallout>
                {viewerIsOwner && approved.id === latest.id && (
                  <ReopenMix
                    projectId={round.view.projectId}
                    versionId={latest.id}
                    stage={round.stage}
                  />
                )}
              </>
            ) : latest.decision === null && !extra?.reopenedAt ? (
              <PendingVersion
                round={round}
                version={latest}
                engineer={engineer}
                viewerIsOwner={viewerIsOwner}
              />
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
