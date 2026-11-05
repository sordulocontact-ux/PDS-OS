import { VersionCard } from "@/components/ui/version-card";
import { masterInHouse } from "@/lib/i18n/fr/master-inhouse";
import { masterJourney } from "@/lib/i18n/fr/master-journey";
import { masterRound } from "@/lib/i18n/fr/master-round";
import type { RoundStepView } from "@/lib/master-workflow/round-step";

import { PendingVersion } from "./pending-version";
import { RoundVersionCard } from "./round-version-card";
import { ReopenMenu } from "./version-decision";

const fr = { masterJourney, masterRound, masterInHouse };

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
        // Newest first: the one after a version in the list came before it.
        const previousOf = (v: (typeof older)[number]) =>
          title.versions[title.versions.indexOf(v) + 1] ?? null;
        const pending = latest.decision === null && !extra?.reopenedAt;
        const card = (
          v: (typeof older)[number],
          menu: React.ReactNode = null,
        ) => (
          <RoundVersionCard
            key={v.id}
            round={round}
            version={v}
            previous={previousOf(v)}
            engineer={engineer}
            menu={menu}
          />
        );
        // The validated version says who validated it; reopening it is in
        // its « ⋯ » (Ibé, 04/11/2026: only the essential once validated).
        const reopen =
          viewerIsOwner && approved?.id === latest.id ? (
            <ReopenMenu
              projectId={round.view.projectId}
              versionId={latest.id}
              stage={round.stage}
            />
          ) : null;
        return (
          <section key={title.masterId} className="flex flex-col gap-3">
            <h3 className="text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)] font-semibold">
              {several ? `« ${title.title} » · ` : ""}
              {t.versions.title(label, title.versions.length)}
            </h3>
            {!inLead && !approved && pending ? (
              <PendingVersion
                round={round}
                version={latest}
                previous={previousOf(latest)}
                engineer={engineer}
                viewerIsOwner={viewerIsOwner}
              />
            ) : (
              !inLead && card(latest, reopen)
            )}
            {older.length > 0 && (
              <VersionCard title={t.versions.previous(older.length)}>
                {older.map((v) => card(v))}
              </VersionCard>
            )}
          </section>
        );
      })}
    </div>
  );
}
