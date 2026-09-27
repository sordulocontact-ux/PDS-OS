import { notFound } from "next/navigation";

import { FramingHeaderAction } from "@/components/projects/framing-header-action";
import { EditAccessProvider } from "@/components/projects/edit-access";
import {
  ProjectSidebar,
  ProjectSidebarMobile,
} from "@/components/projects/project-sidebar";
import { ReadOnlyNotice } from "@/components/projects/read-only-notice";
import { WorkflowBreadcrumb } from "@/components/projects/workflow-breadcrumb";
import { requireApproved } from "@/lib/auth/dal";
import { hasPendingValidation } from "@/lib/framing/related";
import { projectKindLabel } from "@/lib/projects/labels";
import { canEditProject } from "@/lib/projects/edit-access";
import { getProject } from "@/lib/projects/queries";
import { isFramingValidated } from "@/lib/projects/types";
import { allInOrder } from "@/lib/utils/parallel";

// Project frame: header, then content next to the contextual sidebar (Figma
// "Double sidebar", docs/DESIGN.md § 4). The main app sidebar collapses to
// icons whenever a project page is open, and the two sidebars fuse into one
// card (components/shell/use-collapsed-nav.tsx, shared through context so
// both agree). Pages below still check access themselves (a layout does not
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

  // "Demander la validation" sits on the title's own line, only while the
  // Cadrage is in progress and nothing is already awaiting a decision — the
  // framing stage's state comes for free from project.stages, so only the
  // pending check needs its own (single, boolean) query.
  const framingStage = project.stages.find((s) => s.key === "framing");
  const framingActionable =
    canEdit &&
    framingStage?.state === "in_progress" &&
    !(await hasPendingValidation(framingStage.id));

  return (
    <div className="flex flex-1">
      {/* Sits right against the main sidebar (collapsed to icons on a
          project page), so the two read as one "double sidebar" (Figma). */}
      {project.stages.length > 0 && (
        <ProjectSidebar projectId={project.id} projectTitle={project.title} />
      )}

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-4 pt-6 md:px-8 md:pt-8">
        <header className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-2xl font-semibold tracking-tight break-words">
              {project.title}
            </h1>
            {framingStage && framingActionable && (
              <FramingHeaderAction
                projectId={project.id}
                stageId={framingStage.id}
              />
            )}
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
            <ProjectSidebarMobile
              projectId={project.id}
              projectTitle={project.title}
            />
            <WorkflowBreadcrumb
              projectId={project.id}
              lockedSteps={
                isFramingValidated(project.stages) ? [] : ["strategy"]
              }
            />
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
