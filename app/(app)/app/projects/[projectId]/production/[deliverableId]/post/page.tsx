import { notFound, redirect } from "next/navigation";

import { DecisionSection } from "@/components/production/post/decision-section";
import { ReferencesSection } from "@/components/production/post/references-section";
import { ShootAlert } from "@/components/production/post/shoot-alert";
import { StepsSection } from "@/components/production/post/steps-section";
import { VersionsSection } from "@/components/production/post/versions-section";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { loadPostProduction } from "@/lib/production/post/queries";
import { suggestPostSteps } from "@/lib/production/post/suggestions";
import { loadProductionSheet } from "@/lib/production/sheet";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { allInOrder } from "@/lib/utils/parallel";

const t = fr.productionPost;

export const metadata = { title: `${t.title} · ${fr.app.name}` };

/**
 * Marketing › Production › one deliverable › Postproduction (ticket
 * « Workflow Production complet », parcours 14 à 18): the references of the
 * edit, its steps and who does them, every version with its timed feedback
 * and the corrections to transmit, then the final validation. The owner
 * organises; the owner and the project's creative directors review, while
 * the « production » stage runs.
 */
export default async function ProductionPostPage({
  params,
}: PageProps<"/app/projects/[projectId]/production/[deliverableId]/post">) {
  const { projectId, deliverableId } = await params;
  const [access] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
  ]);
  const data = await loadProductionSheet(projectId, deliverableId, access);
  if (!data) notFound();
  const sheet = data.sheet;
  if (!sheet || !access.organizationId)
    redirect(routes.projectProductionSheet(projectId, deliverableId));

  const people = { members: data.members, contacts: data.contacts };
  const post = await loadPostProduction({
    projectId,
    sheetId: sheet.id,
    ...people,
  });
  const scope = {
    projectId,
    sheetId: sheet.id,
    organizationId: access.organizationId,
  };
  const role = { canOrganize: data.canOrganize, canReview: post.canReview };
  const suggestions = suggestPostSteps({
    existing: post.steps.map((s) => s.key),
    soundCapture: sheet.brief.soundCapture,
    subtitles: data.heritage.fiche?.subtitles ?? null,
  });
  const status =
    data.stageState !== "in_progress"
      ? t.locked
      : !role.canOrganize && !role.canReview
        ? t.readOnly
        : null;

  return (
    <div className="flex flex-col gap-10">
      {status && <p className="text-sm text-muted-foreground">{status}</p>}
      {post.shootAlert && <ShootAlert alert={post.shootAlert} />}
      <ReferencesSection
        scope={scope}
        fiche={data.heritage.fiche}
        references={post.references}
        canOrganize={role.canOrganize}
      />
      <StepsSection
        scope={scope}
        people={people}
        steps={post.steps}
        suggestions={suggestions}
        canOrganize={role.canOrganize}
      />
      <VersionsSection
        scope={scope}
        people={people}
        versions={post.versions}
        role={role}
      />
      <DecisionSection
        projectId={projectId}
        deliverableId={deliverableId}
        versions={post.versions}
        canReview={role.canReview}
      />
    </div>
  );
}
