import type { Metadata } from "next";
import { IconGlobePointer } from "nucleo-sharp-essential";
import { notFound } from "next/navigation";

import { AnomaliesSection } from "@/components/distribution/anomalies-section";
import { DeclarationHistory } from "@/components/distribution/declaration-history";
import { TrackingCycle } from "@/components/distribution/tracking-cycle";
import { EmptyState } from "@/components/shell/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { ToneCallout } from "@/components/ui/tone-callout";
import { ViewLink } from "@/components/ui/view-link";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import {
  countRecordedChecks,
  loadAnomalies,
} from "@/lib/distribution/anomalies-queries";
import { platformLabel } from "@/lib/distribution/platforms";
import { loadPlatformsView } from "@/lib/distribution/platforms-queries";
import { cycleState } from "@/lib/distribution/tracking";
import { loadTrackingView } from "@/lib/distribution/tracking-queries";
import { fr } from "@/lib/i18n/fr";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { isUuid } from "@/lib/release/uuid";
import { allInOrder } from "@/lib/utils/parallel";

const t = fr.distribution.tracking;

export const metadata: Metadata = { title: `${t.title} · ${fr.app.name}` };

// Distribution, Suivi (ticket « Distribution » § 6.8-6.10, § 7): the manual
// deposit at The Orchard and the distributor's answers, as declared by the
// project's owner once the dossier is validated. PDS OS sends nothing.
export default async function DistributionTrackingPage({
  params,
}: PageProps<"/app/projects/[projectId]/release/tracking">) {
  const { projectId } = await params;
  if (!isUuid(projectId)) notFound();
  const [access, project] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
  ]);
  const [view, platforms, anomalies, recorded] = await Promise.all([
    loadTrackingView(project, access),
    loadPlatformsView(project, access),
    loadAnomalies(projectId, access),
    countRecordedChecks(projectId),
  ]);
  const cycle =
    view.current !== null ? cycleState(view.declarations, view.current) : null;

  return (
    <div className="grid gap-6">
      <header className="grid gap-1">
        <h2 className="text-lg font-semibold">{t.title}</h2>
        <p className="text-sm text-muted-foreground">{t.description}</p>
      </header>
      <ToneCallout tone="info">{fr.distribution.manualNotice}</ToneCallout>
      {view.current === null ? (
        <EmptyState
          icon={IconGlobePointer}
          title={t.notValidatedTitle}
          body={t.notValidatedBody}
          action={
            <ViewLink
              href={routes.projectReleaseDossier(projectId)}
              className={buttonVariants({ variant: "outline" })}
            >
              {t.toDossier}
            </ViewLink>
          }
        />
      ) : (
        <>
          {cycle?.outcome?.kind === "corrections_requested" && (
            <ToneCallout tone="warning">
              {fr.distribution.anomalies.correctionsCallout}
            </ToneCallout>
          )}
          {cycle && (
            <TrackingCycle
              projectId={projectId}
              organizationId={view.organizationId}
              state={cycle}
              canEdit={view.canEdit}
            />
          )}
        </>
      )}
      <AnomaliesSection
        projectId={projectId}
        anomalies={anomalies}
        platforms={platforms.platforms.map((platform) => ({
          key: platform.platform,
          name: platformLabel(platform),
        }))}
        firstMasterId={project.masters[0]?.id ?? null}
        uncheckedChecks={6 - recorded}
        canCheck={platforms.canCheck}
      />
      <DeclarationHistory declarations={view.declarations} />
    </div>
  );
}
