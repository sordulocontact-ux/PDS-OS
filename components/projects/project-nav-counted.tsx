import {
  ProjectSidebar,
  ProjectSidebarMobile,
  type ProjectNavProps,
} from "@/components/projects/project-sidebar";
import { WorkCountReporter } from "@/components/shell/work-count";
import { countMine, loadShellJourneys } from "@/lib/overview/journeys";

// The project's navigation with the viewer's « À vous » counts, read from
// the journeys (lib/overview/journeys.ts). Rendered under a Suspense by the
// project's layout, the same navigation without counts as its fallback: the
// page never waits for the journeys (shell.md, sous-lot 2).

export async function CountedProjectSidebar(props: ProjectNavProps) {
  const all = await loadShellJourneys(props.projectId);
  return (
    <>
      <ProjectSidebar {...props} counts={countMine(all)} />
      <WorkCountReporter projectId={props.projectId} count={all.mine.length} />
    </>
  );
}

export async function CountedProjectSidebarMobile(props: ProjectNavProps) {
  const all = await loadShellJourneys(props.projectId);
  return <ProjectSidebarMobile {...props} counts={countMine(all)} />;
}
