import { notFound } from "next/navigation";

import { LegalSteps } from "@/components/projects/legal-steps";
import { ProjectBreadcrumb } from "@/components/projects/project-breadcrumb";
import { ProjectHeader } from "@/components/projects/project-header";
import { EditAccessProvider } from "@/components/projects/edit-access";
import {
  ProjectSidebar,
  ProjectSidebarMobile,
} from "@/components/projects/project-sidebar";
import { ProjectTabs } from "@/components/projects/project-tabs";
import { ReadOnlyNotice } from "@/components/projects/read-only-notice";
import { SectionSteps } from "@/components/projects/section-steps";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { loadProjectCover } from "@/lib/projects/cover";
import { projectKindLabel } from "@/lib/projects/labels";
import { canEditProject } from "@/lib/projects/edit-access";
import { getProject } from "@/lib/projects/queries";
import {
  distributionPages,
  distributionSteps,
} from "@/lib/ui/distribution-steps";
import { marketingPages, marketingSteps } from "@/lib/ui/marketing-steps";
import { masterSteps, type MasterTab } from "@/lib/ui/master-steps";
import { DOUBLE_SIDEBAR } from "@/lib/ui/project-sections";
import { formatShortDate } from "@/lib/release/format";
import { projectStatusTone, workflowStatusTone } from "@/lib/ui/state-tones";
import { allInOrder } from "@/lib/utils/parallel";
import { loadWorkflowStates } from "@/lib/workflow-status/load";
import { projectStatus } from "@/lib/workflow-status/rules";

// Project frame: header, then the sections — either the contextual sidebar
// next to the content (Figma "Double sidebar") or one row of tabs under the
// header, never both: DOUBLE_SIDEBAR in lib/ui/project-sections.ts picks one
// (docs/DESIGN.md § 4). With the sidebar, the main app sidebar collapses to
// icons whenever a project page is open, and the two fuse into one card
// (components/shell/use-collapsed-nav.tsx, shared through context so both
// agree). Pages below still check access themselves (a layout does not
// re-run on client navigation); the project query is cached per request, so
// they reuse it for free.
export default async function ProjectLayout({
  children,
  params,
}: LayoutProps<"/app/projects/[projectId]">) {
  const { projectId } = await params;
  const [access, project] = await allInOrder([
    requireApproved(),
    getProject(projectId),
  ]);
  if (!project) notFound();

  const canEdit = canEditProject(access, project);
  const canSeeLegal = can(access, "manage_legal");

  // Each workflow's state, read from its sources (shared with the overview
  // in the same request): the sidebar's dots, the chevrons' checks. The
  // Stratégie opens once the Plan du Projet launches it.
  const launched = project.stages.length > 0;
  const [flows, coverUrl] = await Promise.all([
    loadWorkflowStates(project.id),
    loadProjectCover(project.masters.map((master) => master.id)),
  ]);
  const stateOf = (key: keyof NonNullable<typeof flows>["states"]) => {
    const state = flows?.states[key];
    return state && state !== "restricted" ? state : null;
  };
  const statuses = Object.fromEntries(
    Object.entries(flows?.states ?? {}).flatMap(([key, state]) =>
      state && state !== "restricted" ? [[key, state.status]] : [],
    ),
  );
  const strategyLaunched =
    (stateOf("marketing")?.status ?? "not_started") !== "not_started";
  const legalDone = flows?.legalDone ?? [];
  // Each workflow's chevrons, shared by its row of steps and the breadcrumb.
  const steps = {
    marketing: marketingSteps(project.id, {
      strategyLaunched,
      validatedStages: project.stages
        .filter((stage) => stage.state === "validated")
        .map((stage) => stage.key),
    }),
    distribution: distributionSteps(project.id, stateOf("distribution")?.done),
    master: masterSteps(
      project.id,
      (stateOf("master")?.done ?? []) as MasterTab[],
    ),
  };

  // Launched: the status its workflows give it; before, its transmission's.
  const common = flows && launched ? projectStatus(flows.states) : null;
  const status = common
    ? {
        label: fr.workflowStatus.statuses[common],
        tone: workflowStatusTone[common],
      }
    : {
        label: fr.transmission.statuses[project.status],
        tone: projectStatusTone[project.status],
      };
  const releaseDate = flows?.details.releaseDate ?? null;

  return (
    <div className="flex flex-1">
      {/* Sits right against the main sidebar (collapsed to icons on a
          project page), so the two read as one "double sidebar" (Figma). */}
      {DOUBLE_SIDEBAR && launched && (
        <ProjectSidebar
          projectId={project.id}
          projectTitle={project.title}
          canSeeLegal={canSeeLegal}
          workflows={flows?.workflows}
          statuses={statuses}
        />
      )}

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-4 pt-6 md:px-8 md:pt-8">
        <div className="flex flex-col gap-5">
          <ProjectBreadcrumb
            projectId={project.id}
            projectTitle={project.title}
            artist={
              project.artistName
                ? {
                    name: project.artistName,
                    href: project.mainArtistId
                      ? routes.artist(project.mainArtistId)
                      : null,
                  }
                : null
            }
            launched={launched}
            canSeeLegal={canSeeLegal}
            workflows={flows?.workflows}
            steps={steps}
            legalDone={legalDone}
          />
          <ProjectHeader
            title={project.title}
            kind={projectKindLabel({
              type: project.type,
              musicFormat: project.musicFormat,
              contentFormatName: project.contentFormat?.name ?? null,
            })}
            artistName={project.artistName}
            releaseDate={releaseDate ? formatShortDate(releaseDate) : null}
            coverUrl={coverUrl}
            status={status}
          />
        </div>

        {/* Sections exist once the project is launched, not before. */}
        {launched && (
          <>
            {DOUBLE_SIDEBAR ? (
              <ProjectSidebarMobile
                projectId={project.id}
                projectTitle={project.title}
                canSeeLegal={canSeeLegal}
                workflows={flows?.workflows}
                statuses={statuses}
              />
            ) : (
              <ProjectTabs
                projectId={project.id}
                canSeeLegal={canSeeLegal}
                workflows={flows?.workflows}
              />
            )}
            {/* The chevrons of the open workflow, if any: each hides itself
                outside its workflow. The Cadrage has none: it stands above
                the workflows (ticket « Architecture globale »). */}
            <SectionSteps
              within={marketingPages(project.id)}
              label={fr.shell.project.marketingSteps.label}
              soon={fr.shell.project.marketingSteps.soon}
              steps={steps.marketing}
            />
            <SectionSteps
              within={distributionPages(project.id)}
              label={fr.shell.project.distributionSteps.label}
              soon={fr.shell.project.marketingSteps.soon}
              steps={steps.distribution}
            />
            <SectionSteps
              within={[routes.projectMaster(project.id)]}
              label={fr.masterWorkflow.steps.label}
              soon={fr.masterWorkflow.steps.soon}
              steps={steps.master}
            />
            {canSeeLegal && (
              <LegalSteps projectId={project.id} done={legalDone} />
            )}
          </>
        )}

        {/* Only the owner writes inside a launched project; the database enforces it. */}
        <EditAccessProvider canEdit={canEdit}>
          {launched && (
            <ReadOnlyNotice
              projectId={project.id}
              ownerName={project.ownerName}
            />
          )}
          <div className="flex flex-col pb-8">{children}</div>
        </EditAccessProvider>
      </div>
    </div>
  );
}
