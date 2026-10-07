import { notFound } from "next/navigation";

import { LegalSteps } from "@/components/projects/legal-steps";
import { EditAccessProvider } from "@/components/projects/edit-access";
import {
  ProjectSidebar,
  ProjectSidebarMobile,
} from "@/components/projects/project-sidebar";
import { ProjectTabs } from "@/components/projects/project-tabs";
import { ReadOnlyNotice } from "@/components/projects/read-only-notice";
import { SectionSteps } from "@/components/projects/section-steps";
import { WorkflowBreadcrumb } from "@/components/projects/workflow-breadcrumb";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { loadLegalStepsDone } from "@/lib/legal/steps-done";
import { projectKindLabel } from "@/lib/projects/labels";
import { canEditProject } from "@/lib/projects/edit-access";
import { getProject } from "@/lib/projects/queries";
import { masterSteps } from "@/lib/ui/master-steps";
import { DOUBLE_SIDEBAR } from "@/lib/ui/project-sections";
import { isWorkflowLaunched } from "@/lib/plan/queries";
import { allInOrder } from "@/lib/utils/parallel";

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

  // The Brief is sent for validation from its own page (framing/brief);
  // the Stratégie opens once the Plan du Projet launches it.
  const [strategyLaunched, legalDone] = await Promise.all([
    project.stages.length > 0
      ? isWorkflowLaunched(project.id, "strategy")
      : false,
    // The checks of the Juridique steps, for those who see the section.
    canSeeLegal && project.stages.length > 0 ? loadLegalStepsDone(project) : [],
  ]);

  return (
    <div className="flex flex-1">
      {/* Sits right against the main sidebar (collapsed to icons on a
          project page), so the two read as one "double sidebar" (Figma). */}
      {DOUBLE_SIDEBAR && project.stages.length > 0 && (
        <ProjectSidebar
          projectId={project.id}
          projectTitle={project.title}
          canSeeLegal={canSeeLegal}
        />
      )}

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-4 pt-6 md:px-8 md:pt-8">
        <header className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-2xl font-semibold tracking-tight break-words">
              {project.title}
            </h1>
          </div>
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

        {/* Sections exist once the project is launched, not before. */}
        {project.stages.length > 0 && (
          <>
            {DOUBLE_SIDEBAR ? (
              <ProjectSidebarMobile
                projectId={project.id}
                projectTitle={project.title}
                canSeeLegal={canSeeLegal}
              />
            ) : (
              <ProjectTabs projectId={project.id} canSeeLegal={canSeeLegal} />
            )}
            {/* The steps of the open process, if any: each hides itself
                outside its section. */}
            <WorkflowBreadcrumb
              projectId={project.id}
              validatedStages={project.stages
                .filter((stage) => stage.state === "validated")
                .map((stage) => stage.key)}
              lockedSteps={strategyLaunched ? [] : ["strategy"]}
            />
            <SectionSteps
              base={routes.projectMaster(project.id)}
              label={fr.masterWorkflow.steps.label}
              soon={fr.masterWorkflow.steps.soon}
              steps={masterSteps(project.id)}
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
