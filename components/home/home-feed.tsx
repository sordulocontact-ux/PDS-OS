import {
  ActivityCard,
  HandoverCard,
  ProjectsCard,
  ProposalsCard,
  ReleasesCard,
  TasksCard,
  ValidationsCard,
} from "@/components/home/home-cards";
import { CardGrid } from "@/components/ui/card-grid";
import type { Access } from "@/lib/auth/access";
import { fr } from "@/lib/i18n/fr";
import { loadRecentActivity } from "@/lib/insights/activity";
import { loadReleasesOverview } from "@/lib/insights/releases";
import { loadMyTodo } from "@/lib/insights/todo";
import { handoverOf } from "@/lib/projects/handover";
import { listProjects } from "@/lib/projects/queries";

// The home page cards. Streamed behind a Suspense boundary: the greeting
// and PO show before these queries answer.
export async function HomeFeed({ access }: { access: Access }) {
  const [todo, events, { projects }, releases] = await Promise.all([
    loadMyTodo(access),
    loadRecentActivity({ days: 7, limit: 5 }),
    listProjects(),
    loadReleasesOverview(),
  ]);
  const { toAccept, toRetransmit } = handoverOf(projects, access);

  return (
    <CardGrid>
      {toAccept.length > 0 && (
        <HandoverCard
          title={fr.transmission.cards.toAccept}
          projects={toAccept}
        />
      )}
      {toRetransmit.length > 0 && (
        <HandoverCard
          title={fr.transmission.cards.toRetransmit}
          projects={toRetransmit}
        />
      )}
      <TasksCard tasks={todo.tasks} />
      <ProjectsCard projects={projects} />
      <ValidationsCard validations={todo.validations} />
      <ProposalsCard proposals={todo.proposals} />
      <ActivityCard events={events} />
      <ReleasesCard releases={releases} />
    </CardGrid>
  );
}
