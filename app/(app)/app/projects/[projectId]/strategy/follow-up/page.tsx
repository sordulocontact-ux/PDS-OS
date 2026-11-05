import { IconChevronLeft } from "nucleo-sharp-essential";
import { notFound } from "next/navigation";

import { FollowUpGroups } from "@/components/strategy/follow-up/follow-up-groups";
import { KpiTable } from "@/components/strategy/follow-up/kpi-table";
import { RecommendationCard } from "@/components/strategy/follow-up/recommendation-card";
import { SettledRecommendations } from "@/components/strategy/follow-up/settled-recommendations";
import { ToneCallout } from "@/components/ui/tone-callout";
import { ViewLink } from "@/components/ui/view-link";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { formatBriefDate } from "@/lib/framing/assess";
import { fr } from "@/lib/i18n/fr";
import { canEditProject } from "@/lib/projects/edit-access";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { dayOffset } from "@/lib/strategy/calendar";
import { loadFollowUp } from "@/lib/strategy/follow-up-data";
import { loadStrategy } from "@/lib/strategy/queries";
import { allInOrder } from "@/lib/utils/parallel";

/**
 * Follow-up of a validated strategy (ticket Stratégie § 14): before the
 * release, what is Prêt, En cours, En attente or Bloqué; after it, each KPI
 * against its latest real value. Recommendations rest on real data only.
 * States, gaps and recommendations are computed by code
 * (lib/strategy/follow-up*.ts, recommendations.ts); the owner acts, the
 * others read and are told so. Settled recommendations stay listed with
 * their task or their reason (MKT-C2-02).
 */
export default async function StrategyFollowUpPage({
  params,
}: PageProps<"/app/projects/[projectId]/strategy/follow-up">) {
  const { projectId } = await params;
  const [access, project] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
  ]);
  const data = await loadStrategy(projectId, access);
  if (!data) notFound();
  const t = fr.strategyFollowUp;

  const back = (
    <ViewLink
      href={routes.projectStrategy(projectId)}
      className="-ml-1 inline-flex min-h-10 w-fit items-center gap-1 rounded-md px-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <IconChevronLeft aria-hidden className="size-4" />
      {t.back}
    </ViewLink>
  );
  if (data.stage?.state !== "validated")
    return (
      <div className="flex flex-col gap-6 pt-6">
        {back}
        <ToneCallout tone="neutral">{t.locked}</ToneCallout>
      </div>
    );

  const followUp = await loadFollowUp(projectId, project.title, data);
  const canAct = canEditProject(access, project);
  const ref = followUp.referenceDate;

  return (
    <div className="flex flex-col gap-10 pt-6">
      <div className="flex flex-col gap-3">
        {back}
        <h2 className="text-display-md font-semibold">{t.title}</h2>
      </div>

      {followUp.released && ref ? (
        <section aria-labelledby="after-title" className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h3 id="after-title" className="text-display-sm font-semibold">
              {t.after.title}
            </h3>
            <p className="text-body-md text-muted-foreground">
              {t.after.body(formatBriefDate(ref))}
            </p>
          </div>
          <KpiTable
            projectId={projectId}
            kpis={followUp.kpis}
            canNote={canAct}
            today={followUp.today}
          />
        </section>
      ) : (
        <section aria-labelledby="before-title" className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h3 id="before-title" className="text-display-sm font-semibold">
              {t.before.title}
            </h3>
            <p className="text-body-md text-muted-foreground">
              {ref
                ? t.before.body(
                    `${t.inDays(dayOffset(ref, followUp.today))} (${formatBriefDate(ref)})`,
                  )
                : t.before.noDate}
            </p>
          </div>
          <FollowUpGroups groups={followUp.groups} />
        </section>
      )}

      <section aria-labelledby="reco-title" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h3 id="reco-title" className="text-display-sm font-semibold">
            {t.recommendations.title}
          </h3>
          <p className="text-body-md text-muted-foreground">
            {t.recommendations.hint}
          </p>
        </div>
        {followUp.recommendations.length === 0 ? (
          <p className="text-body-md text-muted-foreground">
            {t.recommendations.empty}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {followUp.recommendations.map((rec) => (
              <RecommendationCard
                key={rec.ruleKey}
                projectId={projectId}
                projectTitle={project.title}
                recommendation={rec}
                canAct={canAct}
                members={data.members}
                ownerId={project.ownerPersonId}
                today={followUp.today}
              />
            ))}
          </ul>
        )}
        <SettledRecommendations
          projectId={projectId}
          items={followUp.settled}
        />
      </section>
    </div>
  );
}
