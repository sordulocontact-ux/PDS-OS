import { ProjectFresh } from "@/components/projects/project-fresh";
import { Skeleton } from "@/components/ui/skeleton";
import { elsewhereOf, loadProjectJourneys } from "@/lib/journey/project";

import { NowCard, type NowCardProps } from "./now-card";
import { PathNowCard } from "./path-now-card";

type Props = Omit<NowCardProps, "elsewhere"> & {
  projectId: string;
  // The module's steps whose actions are not « ailleurs » (default: steps).
  here?: ReadonlyArray<{ href: string }>;
  // In a layout: the step shown is the one at the current URL (PathNowCard).
  byPath?: boolean;
};

async function WithElsewhere({ projectId, here, byPath, ...props }: Props) {
  const journeys = await loadProjectJourneys(projectId);
  const elsewhere = elsewhereOf(journeys, here ?? props.steps);
  return byPath ? (
    <PathNowCard {...props} elsewhere={elsewhere} />
  ) : (
    <NowCard {...props} elsewhere={elsewhere} />
  );
}

/**
 * « Maintenant » of a module's page: NowCard with the viewer's actions in
 * the other workflows, which come from every journey of the project. The
 * page never waits for them (ProjectFresh): the card last shown stays until
 * they are read, a placeholder on a first visit.
 */
export function ProjectNowCard(props: Props) {
  return (
    <ProjectFresh
      projectId={props.projectId}
      id="now"
      fallback={<Skeleton className="h-40 rounded-2xl" />}
    >
      <WithElsewhere {...props} />
    </ProjectFresh>
  );
}
