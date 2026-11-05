import { ProductionStepPanel } from "@/components/production/journey/production-step-panel";
import { stepContext } from "@/lib/production/journey/context";
import { notFound, redirect } from "next/navigation";

import { CutDecision } from "@/components/production/post/cut-decision";
import { DecisionSection } from "@/components/production/post/decision-section";
import { ReferencesSection } from "@/components/production/post/references-section";
import { ShootAlert } from "@/components/production/post/shoot-alert";
import { StepsSection } from "@/components/production/post/steps-section";
import { VersionsSection } from "@/components/production/post/versions-section";
import { LightVersionsStep } from "@/components/production/light/light-steps";
import { requireApproved } from "@/lib/auth/dal";
import { loadLightFacts } from "@/lib/production/light/queries";
import { trackOf } from "@/lib/production/track";
import { createClient } from "@/lib/supabase/server";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { todayInParis } from "@/lib/insights/dates";
import { effectiveLogistics } from "@/lib/production/logistics";
import { suggestPostSteps } from "@/lib/production/post/suggestions";
import { loadProductionSheet } from "@/lib/production/sheet";
import { postFor } from "@/lib/production/tab-data";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { allInOrder } from "@/lib/utils/parallel";

const t = fr.productionPost;

/**
 * Marketing › Production › one deliverable › Postproduction (ticket
 * « Workflow Production complet », parcours 14 à 18): the references of the
 * edit, its steps and who does them, every version with its timed feedback
 * and the corrections addressed to someone, then the one decision per version
 * (PROD-029 to PROD-033). The owner
 * organises; the owner and the project's creative directors review, while
 * the « production » stage runs.
 */
export default async function ProductionPostPage({
  params,
}: PageProps<"/app/projects/[projectId]/production/[deliverableId]/post">) {
  const { projectId, deliverableId } = await params;
  // A cover or teasers drawn from the clip: the light journey's Versions.
  const ctx = await stepContext(projectId, deliverableId, "post");
  const light = ctx.data.sheet;
  if (
    light &&
    trackOf(ctx.data.deliverable.title, light.derivedFromSheetId) !== "shoot"
  ) {
    const [facts, { data: canReview }] = await Promise.all([
      loadLightFacts(light.id, deliverableId, light.derivedFromSheetId),
      (await createClient()).rpc("production_can_review", {
        p_project_id: projectId,
      }),
    ]);
    return (
      <ProductionStepPanel
        projectId={projectId}
        deliverableId={deliverableId}
        step={ctx.step}
        steps={ctx.steps}
      >
        <LightVersionsStep
          projectId={projectId}
          data={ctx.data}
          facts={facts}
          organizationId={ctx.access.organizationId}
          canReview={canReview === true}
        />
      </ProductionStepPanel>
    );
  }
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
  const post = await postFor(projectId, deliverableId, access);
  if (!post) notFound();
  const { postStart, postEnd } = effectiveLogistics(
    sheet.logistics,
    data.heritage.fiche,
  );
  const scope = {
    projectId,
    sheetId: sheet.id,
    organizationId: access.organizationId,
    stepDefaults: {
      startsOn: postStart.value,
      endsOn: postEnd.value,
      datesSource: postStart.source ?? postEnd.source,
      accessNote: post.rushesLocation,
    },
  };
  const role = { canOrganize: data.canOrganize, canReview: post.canReview };
  const suggestions = suggestPostSteps({
    existing: post.steps.map((s) => s.key),
    soundCapture: sheet.brief.soundCapture,
    subtitles: data.heritage.fiche?.subtitles ?? null,
  });
  // The editing step's provider is proposed as a version's author and as
  // the one who corrects it, its end date as the due date (PROD-031).
  const editStep =
    post.steps.find((s) => s.key === "edit" && s.holder) ??
    post.steps.find((s) => s.holder) ??
    null;
  const today = todayInParis();
  const correctionDefaults = {
    recipient: editStep?.holder ?? null,
    dueOn:
      editStep?.endsOn && editStep.endsOn >= today ? editStep.endsOn : null,
  };
  const versionDefaults = {
    author: editStep?.holder ?? null,
    nextNumber: (post.versions[0]?.number ?? 0) + 1,
  };
  // External: the company deposits on its link, no post step to create;
  // the proto's decision on the latest version (PR-12).
  const external = sheet.organization.kind === "external";
  const cutWaiting =
    post.versions.find(
      (v) =>
        (v.status === "in_review" || v.status === "final_review") &&
        !v.intApproved,
    ) ?? null;
  const status =
    data.stageState !== "in_progress"
      ? t.locked
      : !role.canOrganize && !role.canReview
        ? t.readOnly
        : null;

  const { step: journeyStep, steps: journeySteps } = await stepContext(
    projectId,
    deliverableId,
    "post",
  );
  return (
    <ProductionStepPanel
      projectId={projectId}
      deliverableId={deliverableId}
      step={journeyStep}
      steps={journeySteps}
    >
      {status && <p className="text-sm text-muted-foreground">{status}</p>}
      {post.shootAlert && <ShootAlert alert={post.shootAlert} />}
      <ReferencesSection
        scope={scope}
        fiche={data.heritage.fiche}
        brief={data.heritage.references}
        references={post.references}
        canOrganize={role.canOrganize}
      />
      {!external && (
        <StepsSection
          scope={scope}
          people={people}
          steps={post.steps}
          suggestions={suggestions}
          canOrganize={role.canOrganize}
          links={post.providerLinks}
          deliverableId={deliverableId}
        />
      )}
      <VersionsSection
        scope={scope}
        people={people}
        versions={post.versions}
        role={role}
        defaults={versionDefaults}
        links={post.providerLinks}
      />
      {external ? (
        cutWaiting &&
        role.canReview && (
          <CutDecision
            projectId={projectId}
            versionId={cutWaiting.id}
            number={cutWaiting.number}
          />
        )
      ) : (
        <DecisionSection
          projectId={projectId}
          deliverableId={deliverableId}
          versions={post.versions}
          canReview={role.canReview}
          reviewers={post.reviewers}
          people={people}
          defaults={correctionDefaults}
        />
      )}
    </ProductionStepPanel>
  );
}
