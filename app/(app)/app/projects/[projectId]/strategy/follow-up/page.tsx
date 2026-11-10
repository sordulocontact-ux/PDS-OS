import { notFound } from "next/navigation";

import { StepSection } from "@/components/shell/journey/step-section";
import { FollowUpGroups } from "@/components/strategy/follow-up/follow-up-groups";
import { StrategyStepFrame } from "@/components/strategy/journey/strategy-step-frame";
import { KpiTable } from "@/components/strategy/follow-up/kpi-table";
import { RecommendationCard } from "@/components/strategy/follow-up/recommendation-card";
import { SettledRecommendations } from "@/components/strategy/follow-up/settled-recommendations";
import { ToneCallout } from "@/components/ui/tone-callout";
import { Rows } from "@/components/ui/rows";
import { requireApproved } from "@/lib/auth/dal";
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

  // Under « Stratégie validée », in the step's frame (the journey keeps
  // that step open, the panel is named « Suivi de la stratégie »).
  const frame = (children: React.ReactNode) => (
    <StrategyStepFrame
      projectId={projectId}
      stepKey="validated"
      page={{ title: t.title }}
    >
      {children}
    </StrategyStepFrame>
  );
  if (data.stage?.state !== "validated")
    return frame(<ToneCallout tone="neutral">{t.locked}</ToneCallout>);

  const followUp = await loadFollowUp(projectId, project.title, data);
  const canAct = canEditProject(access, project);
  const ref = followUp.referenceDate;

  return frame(
    <>
      {followUp.released && ref ? (
        <StepSection
          title={t.after.title}
          description={t.after.body(formatBriefDate(ref))}
        >
          <KpiTable
            projectId={projectId}
            kpis={followUp.kpis}
            canNote={canAct}
            today={followUp.today}
          />
        </StepSection>
      ) : (
        <StepSection
          title={t.before.title}
          description={
            ref
              ? t.before.body(
                  `${t.inDays(dayOffset(ref, followUp.today))} (${formatBriefDate(ref)})`,
                )
              : t.before.noDate
          }
        >
          <FollowUpGroups groups={followUp.groups} />
        </StepSection>
      )}

      <StepSection
        title={t.recommendations.title}
        description={t.recommendations.hint}
      >
        <div className="flex flex-col gap-5">
          {followUp.recommendations.length === 0 ? (
            <p className="text-body-md text-muted-foreground">
              {t.recommendations.empty}
            </p>
          ) : (
            <Rows label={t.recommendations.title}>
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
            </Rows>
          )}
          <SettledRecommendations
            projectId={projectId}
            items={followUp.settled}
          />
        </div>
      </StepSection>
    </>,
  );
}
