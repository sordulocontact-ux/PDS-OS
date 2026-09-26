import { notFound } from "next/navigation";

import { EditAccessProvider } from "@/components/projects/edit-access";
import {
  ProjectSidebar,
  ProjectSidebarMobile,
} from "@/components/projects/project-sidebar";
import { ReadOnlyNotice } from "@/components/projects/read-only-notice";
import { WorkflowBreadcrumb } from "@/components/projects/workflow-breadcrumb";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { canEditProject } from "@/lib/projects/edit-access";
import { getProject } from "@/lib/projects/queries";

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
  const access = await requireApproved();
  const { projectId } = await params;
  const project = await getProject(projectId);
  if (!project) notFound();

  return (
    <div className="flex flex-1">
      {/* Sits right against the main sidebar (collapsed to icons on a
          project page), so the two read as one "double sidebar" (Figma). */}
      {project.stages.length > 0 && (
        <ProjectSidebar projectId={project.id} projectTitle={project.title} />
      )}

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-4 pt-6 md:px-8 md:pt-8">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight break-words">
            {project.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            {[project.artistName, fr.shell.projectTypes[project.type]]
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
            <WorkflowBreadcrumb projectId={project.id} />
          </>
        )}

        {/* Only the owner writes inside a launched project; the database enforces it. */}
        <EditAccessProvider canEdit={canEditProject(access, project)}>
          {project.stages.length > 0 && <ReadOnlyNotice />}
          <div className="flex flex-col pb-8">{children}</div>
        </EditAccessProvider>
      </div>
    </div>
  );
}
