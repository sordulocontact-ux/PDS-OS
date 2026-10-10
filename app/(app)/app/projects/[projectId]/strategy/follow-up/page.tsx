import { FollowUpGroups } from "@/components/strategy/follow-up/follow-up-groups";
import { KpiTable } from "@/components/strategy/follow-up/kpi-table";
import { RecommendationCard } from "@/components/strategy/follow-up/recommendation-card";
import { EmptyNote } from "@/components/shell/empty-state";
import { StrategyTabs } from "@/components/strategy/strategy-tabs";
import { ToneCallout } from "@/components/ui/tone-callout";
import { formatDay } from "@/lib/assistant/facts";
import { fr } from "@/lib/i18n/fr";
import { loadFollowUp } from "@/lib/strategy/follow-up-data";
import { loadStrategyPage } from "@/lib/strategy/page-data";

/**
 * The Strategy after its launch (ticket § 14): before the release, what PO
 * watches (Prêt / En cours / En attente / Bloqué); after it, the strategy's
 * KPIs against the data really available, and a recommendation only on a
 * real value below its target (Appliquer, Ignorer, Parler à PO).
 */
export default async function StrategyFollowUpPage({
  params,
}: PageProps<"/app/projects/[projectId]/strategy/follow-up">) {
  const { projectId } = await params;
  const page = await loadStrategyPage(projectId);
  const t = fr.strategyDocs.followUp;
  const { groups, views, recommendations, released, releaseDate } =
    await loadFollowUp(page);

  const before = (
    <section aria-labelledby="before-title" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="before-title" className="text-body-lg font-semibold">
          {t.beforeTitle}
        </h2>
        <p className="text-caption text-muted-foreground">{t.beforeBody}</p>
      </div>
      <FollowUpGroups groups={groups} />
    </section>
  );

  const after = (
    <section aria-labelledby="after-title" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="after-title" className="text-body-lg font-semibold">
          {t.afterTitle}
        </h2>
        <p className="text-caption text-muted-foreground">
          {released && releaseDate
            ? `${t.released(formatDay(releaseDate))} · ${t.afterBody}`
            : t.notReleased}
        </p>
      </div>
      {views.length === 0 ? (
        <EmptyNote>{t.noKpis}</EmptyNote>
      ) : (
        <KpiTable
          projectId={projectId}
          views={views}
          canNote={page.canEdit}
          showActual={released}
        />
      )}
      {released && (
        <div className="flex flex-col gap-3">
          <h3 className="text-body-md font-semibold">
            {t.recommendationsTitle}
          </h3>
          {recommendations.length === 0 ? (
            <ToneCallout tone="neutral">{t.recommendationsEmpty}</ToneCallout>
          ) : (
            <ul className="flex flex-col gap-3">
              {recommendations.map((r) => (
                <RecommendationCard
                  key={r.ruleKey}
                  projectId={projectId}
                  recommendation={r}
                  canAct={page.canEdit}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );

  return (
    <div className="flex flex-col gap-10 pt-6">
      <StrategyTabs projectId={projectId} />
      {released ? (
        <>
          {after}
          {before}
        </>
      ) : (
        <>
          {before}
          {after}
        </>
      )}
    </div>
  );
}
