import { StepSection } from "@/components/shell/journey/step-section";
import { FactList } from "@/components/ui/fact-list";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
import { productionPreprod } from "@/lib/i18n/fr/production-preprod";
import type { BriefView } from "@/lib/production/preprod/overview";
import { teamMembers } from "@/lib/production/preprod/team";
import { TEAM_FAMILY, TEAM_FIELDS } from "@/lib/production/preprod/team-briefs";
import type { TeamBrief } from "@/lib/production/preprod/types";
import type { Holder, ProductionNeed } from "@/lib/production/sheet";
import { formatDate } from "@/lib/release/format";
import { teamBriefTone } from "@/lib/ui/state-tones";

import { TeamBriefActions } from "./team-brief-actions";

const fr = { productionPreprod };

const t = fr.productionPreprod.briefs;

/**
 * « Briefs d'équipe »: per team, what it receives — the extract computed
 * from the Fiche Livrable and the director's brief, then its own fields —
 * who receives it (the people assigned to the team), the versions it rests
 * on, and whether it was transmitted as it stands.
 */
export function TeamBriefsSection({
  projectId,
  deliverableId,
  sheetId,
  briefs,
  rows,
  needs,
  director,
  canOrganize,
}: {
  projectId: string;
  deliverableId: string;
  sheetId: string;
  briefs: BriefView[];
  rows: TeamBrief[];
  needs: ProductionNeed[];
  director: Holder | null;
  canOrganize: boolean;
}) {
  const members = teamMembers(needs);
  return (
    <StepSection id="briefs" title={t.title} description={t.description}>
      <div className="flex flex-col gap-10">
        {briefs.map(({ team, content, state }) => {
          const row = rows.find((r) => r.team === team);
          const names = [
            ...(team === "director" && director ? [director.name] : []),
            ...members
              .filter((m) => m.family === TEAM_FAMILY[team])
              .map((m) => m.holder.name),
          ];
          const recipients = [...new Set(names)];
          const titleId = `brief-${team}-title`;
          return (
            <article
              key={team}
              aria-labelledby={titleId}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 id={titleId} className="text-base font-semibold">
                      {t.teams[team]}
                    </h3>
                    <StatusBadge tone={teamBriefTone[state]} size="sm">
                      {t.states[state]}
                    </StatusBadge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {recipients.length
                      ? t.recipients(recipients.join(", "))
                      : t.noRecipient}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {[
                      t.versions(content.ficheVersion, content.sourceVersion),
                      row?.transmittedAt && row.transmittedBy
                        ? t.transmittedBy(
                            row.transmittedBy,
                            formatDate(row.transmittedAt),
                          )
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                {canOrganize && (
                  <TeamBriefActions
                    projectId={projectId}
                    deliverableId={deliverableId}
                    sheetId={sheetId}
                    team={team}
                    fields={content.fields}
                    state={state}
                  />
                )}
              </div>
              {state === "outdated" && (
                <ToneCallout tone="warning">{t.outdatedHint}</ToneCallout>
              )}
              <FactList
                emptyLabel={fr.productionPreprod.notFilled}
                facts={[
                  ...content.extract,
                  ...TEAM_FIELDS[team].map((key) => ({
                    label: t.fields[key],
                    value: content.fields[key] ?? null,
                  })),
                ]}
              />
            </article>
          );
        })}
      </div>
    </StepSection>
  );
}
