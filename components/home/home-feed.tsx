import { Suspense } from "react";

import {
  ActivityCard,
  HandoverCard,
  ProjectsCard,
  ProposalsCard,
  ReleasesCard,
  TasksCard,
} from "@/components/home/home-cards";
import { PageSuggestions } from "@/components/assistant/assistant-suggestions";
import { HomeJourneyCards } from "@/components/home/home-journey-cards";
import { WelcomeCard } from "@/components/home/welcome-card";
import { CardGrid } from "@/components/ui/card-grid";
import { JourneyCardsSkeleton } from "@/components/work/journey-actions-card";
import { can, type Access } from "@/lib/auth/access";
import { fr } from "@/lib/i18n/fr";
import { loadWelcome } from "@/lib/home/welcome";
import { loadRecentActivity } from "@/lib/insights/activity";
import { loadReleasesOverview } from "@/lib/insights/releases";
import { freeTasksOf, loadMyTodo } from "@/lib/insights/todo";
import { handoverOf } from "@/lib/projects/handover";
import { listProjects } from "@/lib/projects/queries";

// The home page cards. Streamed behind a Suspense boundary: the greeting
// and PO show before these queries answer.
// A read that fails is said on its card, never shown as an empty list
// (UX test of 09/10/2026: « Aucun projet » on a database timeout).
// What waits for the person comes from the projects' journeys (lib/work/
// journeys.ts, docs/VISION-UX.md § 3): « Validations qui m'attendent » are
// their decisions, « À vous » their other actions (HomeJourneyCards, streamed
// on their own); only the tasks tied to no workflow keep a card of their own.
export async function HomeFeed({ access }: { access: Access }) {
  const [todo, events, { projects, error: projectsError }, releases, welcome] =
    await Promise.all([
      loadMyTodo(access),
      loadRecentActivity({ days: 7, limit: 5 }).then(
        (rows) => ({ rows, error: false }),
        (error: unknown) => {
          console.error("HomeFeed activity:", error);
          return { rows: [], error: true };
        },
      ),
      listProjects(),
      loadReleasesOverview().then(
        (rows) => ({ rows, error: false }),
        (error: unknown) => {
          console.error("HomeFeed releases:", error);
          return { rows: [], error: true };
        },
      ),
      loadWelcome(access),
    ]);
  const freeTasks = freeTasksOf(todo);
  const { toAccept, toRetransmit } = handoverOf(projects, access);
  // « En cours »: launched projects only (accepted, with their stages).
  const running = projects.filter((p) => p.status === "launched");

  return (
    <>
      {/* A project to accept comes first: PO offers to present it. */}
      <PageSuggestions
        items={toAccept
          .slice(0, 1)
          .map((p) => fr.shell.home.presentProject(p.title))}
      />
      {welcome && <WelcomeCard variant={welcome} />}
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
        <Suspense fallback={<JourneyCardsSkeleton />}>
          <HomeJourneyCards access={access} />
        </Suspense>
        {(freeTasks.length > 0 || todo.error) && (
          <TasksCard tasks={freeTasks} error={todo.error} />
        )}
        <ProjectsCard projects={running} error={Boolean(projectsError)} />
        {can(access, "pilot_projects") &&
          (todo.proposals.length > 0 || todo.error) && (
            <ProposalsCard proposals={todo.proposals} error={todo.error} />
          )}
        <ActivityCard events={events.rows} error={events.error} />
        <ReleasesCard releases={releases.rows} error={releases.error} />
      </CardGrid>
    </>
  );
}
