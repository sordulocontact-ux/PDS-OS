import { notFound } from "next/navigation";
import { Suspense } from "react";

import { EditAccessProvider } from "@/components/projects/edit-access";
import {
  CountedProjectSidebar,
  CountedProjectSidebarMobile,
} from "@/components/projects/project-nav-counted";
import {
  ProjectSidebar,
  ProjectSidebarMobile,
} from "@/components/projects/project-sidebar";
import { ProjectHeader } from "@/components/projects/project-header";
import { ProjectLive } from "@/components/projects/project-live";
import { ProjectTabs } from "@/components/projects/project-tabs";
import { BackLink } from "@/components/shell/back-link";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { projectKindLabel } from "@/lib/projects/labels";
import {
  canEditProject,
  canSeeProjectBudget,
} from "@/lib/projects/edit-access";
import { planLaunchedAt } from "@/lib/plan/queries";
import { getProject } from "@/lib/projects/queries";
import { DOUBLE_SIDEBAR } from "@/lib/ui/project-sections";
import { allInOrder } from "@/lib/utils/parallel";
import { loadWorkflowStates } from "@/lib/workflow-status/load";

// Project frame: the head of the page (ModuleHeader through ProjectHeader:
// trail « Projet › Module › … », the Marketing's pills, the module's 30 px
// title, its facts and actions, docs/DESIGN.md § 4), then the sections —
// either the contextual sidebar next to the content (Figma "Double sidebar")
// or one row of tabs under the header, never both: DOUBLE_SIDEBAR in
// lib/ui/project-sections.ts picks one. The header rendered here is the
// default one, read from the URL; a page or a section layout that knows more
// (its step, its facts, « Qui fait quoi ») renders its own ProjectHeader and
// this one steps aside (`group/project`, docs/ARCHITECTURE.md § 3 ter). With
// the sidebar, the main app sidebar collapses to icons whenever a project
// page is open. Pages below still check access themselves (a layout does not
// re-run on client navigation); the project query is cached per request, so
// they reuse it for free.
export default async function ProjectLayout({
  children,
  params,
}: LayoutProps<"/app/projects/[projectId]">) {
  const { projectId } = await params;
  // Each workflow's state, read from its sources (shared with the overview
  // and the header in the same request): the navigation's dots. Read with
  // the project, not after it (one round fewer before every page).
  const [access, project, flows, launchedAt] = await allInOrder([
    requireApproved(),
    getProject(projectId),
    loadWorkflowStates(projectId),
    planLaunchedAt(projectId),
  ]);
  if (!project) notFound();

  const canEdit = canEditProject(access, project);
  const canSeeLegal = can(access, "manage_legal");
  const canSeeBudget = canSeeProjectBudget(access, project);

  // The Cadrage's dot runs until the plan is launched, then is done (proto).
  const statuses = {
    framing: launchedAt ? "done" : "in_progress",
    ...Object.fromEntries(
      Object.entries(flows?.states ?? {}).flatMap(([key, state]) =>
        state && state !== "restricted" ? [[key, state.status]] : [],
      ),
    ),
  };
  const nav = {
    projectId: project.id,
    projectTitle: project.title,
    canSeeLegal,
    canSeeBudget,
    workflows: flows?.workflows,
    statuses,
  };

  return (
    <div className="flex flex-1">
      {/* Pages read again when the project changes elsewhere (JUR-12). */}
      <ProjectLive projectId={project.id} />
      {/* Sits right against the main sidebar (collapsed to icons on a
          project page), so the two read as one "double sidebar" (Figma). */}
      {/* The viewer's counts come from the journeys, under a Suspense: the
          page never waits for them. */}
      {DOUBLE_SIDEBAR && project.stages.length > 0 && (
        <Suspense fallback={<ProjectSidebar {...nav} />}>
          <CountedProjectSidebar {...nav} />
        </Suspense>
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
          {project.stages.length > 0 && (
            <>
              {DOUBLE_SIDEBAR ? (
                <Suspense fallback={<ProjectSidebarMobile {...nav} />}>
                  <CountedProjectSidebarMobile {...nav} />
                </Suspense>
              ) : (
                <ProjectTabs
                  projectId={project.id}
                  canSeeLegal={canSeeLegal}
                  canSeeBudget={canSeeBudget}
                  workflows={flows?.workflows}
                />
              )}
            </>
          )}

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
