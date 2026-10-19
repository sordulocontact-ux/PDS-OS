import { IconBox2 } from "nucleo-sharp-essential";
import { notFound } from "next/navigation";

import { ValidationPanel } from "@/components/framing/validation-panel";
import { ProductionDeliverableItem } from "@/components/production/production-deliverable";
import { EmptyState } from "@/components/shell/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatTiles } from "@/components/ui/stat-tiles";
import { ViewLink } from "@/components/ui/view-link";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { DELIVERY_STATES } from "@/lib/production/rules";
import { loadProduction } from "@/lib/production/queries";
import { canEditProject } from "@/lib/projects/edit-access";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { allInOrder } from "@/lib/utils/parallel";

const t = fr.production;

export const metadata = { title: `${t.title} · ${fr.app.name}` };

/**
 * Marketing › Production: each deliverable committed by the Stratégie, from
 * its creative source (the Conception's validated version) to « Livré »
 * (ticket « Workflow Production complet », § 20; docs/ARCHITECTURE.md
 * § 8 nonies). The stage is started and finished like the others: the
 * owner asks, the direction validates.
 */
export default async function ProjectProductionPage({
  params,
}: PageProps<"/app/projects/[projectId]/production">) {
  const { projectId } = await params;
  const [access, project] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
  ]);
  const data = await loadProduction(projectId, access);
  if (!data) notFound();

  const state = data.stage?.state ?? "not_started";
  const inProgress = state === "in_progress";
  const canEdit = canEditProject(access, project) && inProgress;
  const canApprove = inProgress && (data.isOwner || data.isCreative);
  const handed = (d: (typeof data.deliverables)[number]) =>
    !d.conception || d.conception.state === "handed";
  const status =
    state === "not_started" ? t.notStarted : inProgress ? null : t.locked;

  return (
    <div className="grid gap-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid content-start gap-4">
          {status && <p className="text-sm text-muted-foreground">{status}</p>}
          {data.deliverables.length === 0 ? (
            <EmptyState
              icon={IconBox2}
              title={t.emptyTitle}
              body={t.empty}
              action={
                <ViewLink
                  href={routes.projectStrategy(projectId)}
                  className={buttonVariants({ variant: "outline" })}
                >
                  {t.toStrategy}
                </ViewLink>
              }
            />
          ) : (
            <>
              <StatTiles
                columns={5}
                stats={DELIVERY_STATES.map((key) => ({
                  label: t.stats[key],
                  value: String(data.counts[key]),
                }))}
              />
              <ul className="grid gap-3">
                {data.deliverables.map((deliverable) => (
                  <li key={deliverable.id}>
                    <ProductionDeliverableItem
                      projectId={projectId}
                      deliverable={deliverable}
                      // MKT-C2-13: Production works on what was handed.
                      canEdit={canEdit && handed(deliverable)}
                      canApprove={canApprove && handed(deliverable)}
                    />
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
        <aside className="grid content-start gap-6">
          <Card>
            <CardContent className="grid gap-3">
              <ValidationPanel
                stage={data.stage}
                pendingValidation={data.pendingValidation}
                projectId={projectId}
                mePersonId={access.personId}
                title={t.stage}
                startLabel={t.start}
                // The Production opens with the first sheet transferred
                // from the Conception (handoff_design_sheet), never apart.
                startBlocked={fr.conceptionClosure.production.startBlocked}
              />
              {inProgress && (
                <p className="text-xs text-muted-foreground">{t.finishHint}</p>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
