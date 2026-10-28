import { Suspense } from "react";

import type { NotStartedReason } from "@/components/projects/project-nav-list";
import {
  ProjectSidebar,
  ProjectSidebarMobile,
  type ProjectNavProps,
} from "@/components/projects/project-sidebar";
import { ProjectTabs } from "@/components/projects/project-tabs";
import { SubModuleCountsReporter } from "@/components/shell/module/sub-module-counts";
import { KeptFallback, KeptView } from "@/components/shell/kept-view";
import { WorkCountReporter } from "@/components/shell/work-count";
import { can, type Access } from "@/lib/auth/access";
import { moduleEntries } from "@/lib/journey/landing";
import {
  countMarketingParts,
  countMine,
  loadShellJourneys,
} from "@/lib/overview/journeys";
import { MARKETING_PARTS, type PlanWorkflow } from "@/lib/plan/propose";
import { planLaunchedAt, planWorkflows } from "@/lib/plan/queries";
import { canSeeProjectBudget } from "@/lib/projects/edit-access";
import type { getProject } from "@/lib/projects/queries";
import { loadWorkflowStates } from "@/lib/workflow-status/load";

type Project = NonNullable<Awaited<ReturnType<typeof getProject>>>;
type NavSource = { access: Access; project: Project };

/** Why each workflow not started yet has not, once the plan is launched:
 * left out of it, or in it and waiting (the dot's hint, WorkflowLocked). */
function reasonsOf(
  statuses: Record<string, string>,
  planned: PlanWorkflow[],
): Partial<Record<string, NotStartedReason>> {
  const inPlan = (key: string) =>
    key === "marketing"
      ? planned.some((w) => MARKETING_PARTS.includes(w))
      : planned.includes(key as PlanWorkflow);
  return Object.fromEntries(
    Object.entries(statuses).flatMap(([key, status]) =>
      status === "not_started" && key !== "framing"
        ? [[key, inPlan(key) ? "waiting" : "absent"]]
        : [],
    ),
  );
}

// The project's navigation: its entries and each workflow's dot, read from
// the workflows' states (shared with the header in the same request).
async function navOf({ access, project }: NavSource): Promise<ProjectNavProps> {
  const [flows, launchedAt, planned] = await Promise.all([
    loadWorkflowStates(project.id),
    planLaunchedAt(project.id),
    planWorkflows(project.id),
  ]);
  // The Cadrage's dot runs until the plan is launched, then is done (proto).
  const statuses: Record<string, string> = {
    framing: launchedAt ? "done" : "in_progress",
    ...Object.fromEntries(
      Object.entries(flows?.states ?? {}).flatMap(([key, state]) =>
        state && state !== "restricted" ? [[key, state.status]] : [],
      ),
    ),
  };
  return {
    projectId: project.id,
    projectTitle: project.title,
    canSeeLegal: can(access, "manage_legal"),
    canSeeBudget: canSeeProjectBudget(access, project),
    workflows: flows?.workflows,
    statuses,
    reasons: launchedAt ? reasonsOf(statuses, planned) : {},
  };
}

// The navigation with the viewer's « À vous » counts, read from the
// journeys (lib/overview/journeys.ts): until they are, the same navigation
// as last shown, or without counts on a first visit (shell.md, sous-lot 2).

// Each entry and Marketing pill also links straight to the step it opens on
// (lib/journey/landing.ts), read from the same journeys.

async function CountedSidebar(props: ProjectNavProps) {
  const all = await loadShellJourneys(props.projectId);
  const entries = moduleEntries(props.projectId, all.journeys);
  return (
    <>
      <ProjectSidebar {...props} counts={countMine(all)} entries={entries} />
      <WorkCountReporter projectId={props.projectId} count={all.mine.length} />
      <SubModuleCountsReporter
        projectId={props.projectId}
        counts={countMarketingParts(all)}
        hrefs={entries}
      />
    </>
  );
}

async function CountedSidebarMobile(props: ProjectNavProps) {
  const all = await loadShellJourneys(props.projectId);
  const entries = moduleEntries(props.projectId, all.journeys);
  return (
    <>
      <ProjectSidebarMobile
        {...props}
        counts={countMine(all)}
        entries={entries}
      />
      <SubModuleCountsReporter
        projectId={props.projectId}
        counts={countMarketingParts(all)}
        hrefs={entries}
      />
    </>
  );
}

/** The project's sidebar (desktop), rendered under ProjectFresh. */
export async function ProjectNavSidebar(source: NavSource) {
  const nav = await navOf(source);
  return (
    <Suspense
      fallback={
        <KeptFallback
          id="project-nav-counted"
          fallback={<ProjectSidebar {...nav} />}
        />
      }
    >
      <KeptView id="project-nav-counted">
        <CountedSidebar {...nav} />
      </KeptView>
    </Suspense>
  );
}

/** Its row of chips on a phone, rendered under ProjectFresh. */
export async function ProjectNavMobile(source: NavSource) {
  const nav = await navOf(source);
  return (
    <Suspense
      fallback={
        <KeptFallback
          id="project-nav-mobile-counted"
          fallback={<ProjectSidebarMobile {...nav} />}
        />
      }
    >
      <KeptView id="project-nav-mobile-counted">
        <CountedSidebarMobile {...nav} />
      </KeptView>
    </Suspense>
  );
}

/** One row of tabs under the header instead (DOUBLE_SIDEBAR off). */
export async function ProjectNavTabs(source: NavSource) {
  const nav = await navOf(source);
  return (
    <ProjectTabs
      projectId={nav.projectId}
      canSeeLegal={nav.canSeeLegal}
      canSeeBudget={nav.canSeeBudget ?? true}
      workflows={nav.workflows}
    />
  );
}
