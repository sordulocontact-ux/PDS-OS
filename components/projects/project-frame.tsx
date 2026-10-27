import { EditAccessProvider } from "@/components/projects/edit-access";
import {
  ProjectNavMobile,
  ProjectNavSidebar,
  ProjectNavTabs,
} from "@/components/projects/project-nav-counted";
import { ProjectFresh } from "@/components/projects/project-fresh";
import {
  ProjectSidebarMobileSkeleton,
  ProjectSidebarSkeleton,
} from "@/components/projects/project-sidebar";
import { ProjectHeader } from "@/components/projects/project-header";
import { ProjectLive } from "@/components/projects/project-live";
import { BackLink } from "@/components/shell/back-link";
import type { Access } from "@/lib/auth/access";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { projectKindLabel } from "@/lib/projects/labels";
import { canEditProject } from "@/lib/projects/edit-access";
import type { getProject } from "@/lib/projects/queries";
import { DOUBLE_SIDEBAR } from "@/lib/ui/project-sections";

type Project = NonNullable<Awaited<ReturnType<typeof getProject>>>;

/**
 * Everything of a project's page around its content (the project's layout
 * renders it once the project is known to exist, docs/ARCHITECTURE.md
 * § 3 bis): the head (ModuleHeader through ProjectHeader: trail « Projet ›
 * Module › … », the Marketing's pills, the module's 30 px title, its facts
 * and actions, docs/DESIGN.md § 4), then the sections — either the
 * contextual sidebar next to the content (Figma "Double sidebar") or one
 * row of tabs under the header, never both: DOUBLE_SIDEBAR in lib/ui/
 * project-sections.ts picks one. The header rendered here is the default
 * one, read from the URL; a page or a section layout that knows more (its
 * step, its facts, « Qui fait quoi ») renders its own ProjectHeader and this
 * one steps aside (`group/project`, docs/ARCHITECTURE.md § 3 ter). With the
 * sidebar, the main app sidebar collapses to icons whenever a project page
 * is open.
 */
export function ProjectFrame({
  access,
  project,
  children,
}: {
  access: Access;
  project: Project;
  children: React.ReactNode;
}) {
  const canEdit = canEditProject(access, project);
  const source = { access, project };

  return (
    <div className="flex flex-1">
      {/* Pages read again when the project changes elsewhere (JUR-12). */}
      <ProjectLive projectId={project.id} accountId={access.accountId} />
      {/* Sits right against the main sidebar (collapsed to icons on a
          project page), so the two read as one "double sidebar" (Figma). */}
      {/* Its entries and dots come from the workflows' states, its counts
          from the journeys: the page never waits for them (ProjectFresh). */}
      {DOUBLE_SIDEBAR && project.stages.length > 0 && (
        <ProjectFresh
          projectId={project.id}
          id="project-nav"
          fallback={
            <ProjectSidebarSkeleton
              projectId={project.id}
              projectTitle={project.title}
            />
          }
        >
          <ProjectNavSidebar {...source} />
        </ProjectFresh>
      )}

      {/* Proto « Projet complet » (`.content`, `.wrap`): 28 / 40 px around a
          column of 1180 px at most, blocks 20 px apart. */}
      <div className="flex min-w-0 flex-1 flex-col px-4 pt-5 md:px-10 md:pt-7">
        <div className="group/project mx-auto flex w-full max-w-[var(--content-width)] flex-1 flex-col gap-5">
          {project.stages.length === 0 && (
            <header className="flex flex-col gap-1">
              {/* No sidebar before launch, so no switcher either: the only
                way back to the list (retour du 11/10/2026). */}
              <BackLink href={routes.projects}>
                {fr.shell.project.back}
              </BackLink>
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
          {project.stages.length > 0 &&
            (DOUBLE_SIDEBAR ? (
              <ProjectFresh
                projectId={project.id}
                id="project-nav-mobile"
                fallback={<ProjectSidebarMobileSkeleton />}
              >
                <ProjectNavMobile {...source} />
              </ProjectFresh>
            ) : (
              <ProjectFresh projectId={project.id} id="project-tabs">
                <ProjectNavTabs {...source} />
              </ProjectFresh>
            ))}

          {/* Only the owner writes inside a launched project; the database
            enforces it. The read-only notice sits under the header. */}
          <EditAccessProvider canEdit={canEdit}>
            {project.stages.length > 0 && (
              <ProjectHeader projectId={project.id} isDefault />
            )}
            <div className="flex flex-col pb-8">{children}</div>
          </EditAccessProvider>
        </div>
      </div>
    </div>
  );
}
