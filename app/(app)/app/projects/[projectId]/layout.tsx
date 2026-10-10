import { notFound } from "next/navigation";

import { LegalSteps } from "@/components/projects/legal-steps";
import { EditAccessProvider } from "@/components/projects/edit-access";
import {
  ProjectSidebar,
  ProjectSidebarMobile,
} from "@/components/projects/project-sidebar";
import { ProjectPageTitle } from "@/components/projects/project-page-title";
import { ProjectTabs } from "@/components/projects/project-tabs";
import { ReadOnlyNotice } from "@/components/projects/read-only-notice";
import { SectionSteps } from "@/components/projects/section-steps";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { projectKindLabel } from "@/lib/projects/labels";
import {
  canEditProject,
  canSeeProjectBudget,
} from "@/lib/projects/edit-access";
import { getProject } from "@/lib/projects/queries";
import {
  distributionPages,
  distributionSteps,
} from "@/lib/ui/distribution-steps";
import { marketingPages, marketingSteps } from "@/lib/ui/marketing-steps";
import { masterSteps, type MasterTab } from "@/lib/ui/master-steps";
import { DOUBLE_SIDEBAR } from "@/lib/ui/project-sections";
import { allInOrder } from "@/lib/utils/parallel";
import { loadWorkflowStates } from "@/lib/workflow-status/load";

// Project frame: the page's title (the section's name once launched,
// ProjectPageTitle), then the sections — either the contextual sidebar
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
  const canSeeBudget = canSeeProjectBudget(access, project);

  // Each workflow's state, read from its sources (shared with the overview
  // in the same request): the sidebar's dots, the chevrons' checks. The
  // Stratégie opens once the Plan du Projet launches it.
  const flows = await loadWorkflowStates(project.id);
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

  return (
    <div className="flex flex-1">
      {/* Sits right against the main sidebar (collapsed to icons on a
          project page), so the two read as one "double sidebar" (Figma). */}
      {DOUBLE_SIDEBAR && project.stages.length > 0 && (
        <ProjectSidebar
          projectId={project.id}
          projectTitle={project.title}
          canSeeLegal={canSeeLegal}
          canSeeBudget={canSeeBudget}
          workflows={flows?.workflows}
          statuses={statuses}
        />
      )}

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 pt-6 md:px-8">
        {/* Launched: the section's name, nothing about the project (the
            sidebar's switcher names it, Figma node 76:3145). Before, no
            sections: the project itself is the page. */}
        {project.stages.length > 0 ? (
          <ProjectPageTitle
            projectId={project.id}
            canSeeLegal={canSeeLegal}
            canSeeBudget={canSeeBudget}
            workflows={flows?.workflows}
          />
        ) : (
          <header className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight break-words">
              {project.title}
            </h1>
            <p className="text-sm text-muted-foreground">
              {[
                project.artistName,
                projectKindLabel({
                  type: project.type,
                  musicFormat: project.musicFormat,
                  contentFormatName: project.contentFormat?.name ?? null,
                }),
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </header>
        )}

        {/* Sections exist once the project is launched, not before. */}
        {project.stages.length > 0 && (
          <>
            {DOUBLE_SIDEBAR ? (
              <ProjectSidebarMobile
                projectId={project.id}
                projectTitle={project.title}
                canSeeLegal={canSeeLegal}
                canSeeBudget={canSeeBudget}
                workflows={flows?.workflows}
                statuses={statuses}
              />
            ) : (
              <ProjectTabs
                projectId={project.id}
                canSeeLegal={canSeeLegal}
                canSeeBudget={canSeeBudget}
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
              steps={marketingSteps(project.id, {
                strategyLaunched,
                validatedStages: project.stages
                  .filter((stage) => stage.state === "validated")
                  .map((stage) => stage.key),
              })}
            />
            <SectionSteps
              within={distributionPages(project.id)}
              label={fr.shell.project.distributionSteps.label}
              soon={fr.shell.project.marketingSteps.soon}
              steps={distributionSteps(
                project.id,
                stateOf("distribution")?.done,
              )}
            />
            <SectionSteps
              within={[routes.projectMaster(project.id)]}
              label={fr.masterWorkflow.steps.label}
              soon={fr.masterWorkflow.steps.soon}
              steps={masterSteps(
                project.id,
                (stateOf("master")?.done ?? []) as MasterTab[],
              )}
            />
            {canSeeLegal && (
              <LegalSteps projectId={project.id} done={legalDone} />
            )}
          </>
        )}

        {/* Only the owner writes inside a launched project; the database enforces it. */}
        <EditAccessProvider canEdit={canEdit}>
          {project.stages.length > 0 && (
            <ReadOnlyNotice projectId={project.id} />
          )}
          <div className="flex flex-col pb-8">{children}</div>
        </EditAccessProvider>
      </div>
    </div>
  );
}
