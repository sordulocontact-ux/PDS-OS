import { IconUserPlus } from "@/components/icons";
import Link from "next/link";

import { AssistantPanel } from "@/components/assistant/assistant-panel";
import {
  ActivityCard,
  HandoverCard,
  ProjectsCard,
  ProposalsCard,
  ReleasesCard,
  TasksCard,
  ValidationsCard,
} from "@/components/home/home-cards";
import { PageContainer } from "@/components/shell/page-container";
import { buttonVariants } from "@/components/ui/button";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { loadRecentActivity } from "@/lib/insights/activity";
import { loadReleasesOverview } from "@/lib/insights/releases";
import { loadMyTodo } from "@/lib/insights/todo";
import { countPendingMemberships } from "@/lib/members/queries";
import { listProjects } from "@/lib/projects/queries";

export default async function AppHomePage() {
  const access = await requireApproved();
  const t = fr.shell.home;
  const [pendingCount, todo, events, { projects }, releases] =
    await Promise.all([
      can(access, "administer") && access.organizationId
        ? countPendingMemberships(access.organizationId)
        : Promise.resolve(0),
      loadMyTodo(access),
      loadRecentActivity({ days: 7, limit: 5 }),
      listProjects(),
      loadReleasesOverview(),
    ]);

  // Handover circuit, decided by code from the computed project status.
  const toAccept = projects.filter(
    (p) =>
      p.status === "pending" &&
      p.latestAssignment?.assigneePersonId === access.personId,
  );
  const toRetransmit = can(access, "assign_projects")
    ? projects.filter(
        (p) => p.status === "refused" || p.status === "clarification_requested",
      )
    : [];

  // Layout of the Figma "Desktop - 11": centred greeting, then one column
  // holding the assistant and the cards.
  return (
    <PageContainer className="items-center gap-10 py-10 md:py-20 xl:gap-21 xl:py-33">
      <header className="flex flex-col items-center gap-3 text-center">
        <h1 className="font-display text-display-xl text-ink-800">
          {access.firstName ? t.welcome(access.firstName) : t.welcomeAnonymous}
        </h1>
        <p className="text-body-xl text-[color:var(--text-secondary)]">
          {t.body}
        </p>
      </header>

      <div className="flex w-full max-w-4xl flex-col gap-10 md:gap-16">
        {pendingCount > 0 && (
          <div className="flex flex-col gap-3 rounded-2xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2 text-sm">
              <IconUserPlus
                className="size-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
              {t.pendingRequests(pendingCount)}
            </p>
            <Link
              href={routes.members}
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              {t.toMembers}
            </Link>
          </div>
        )}
        <AssistantPanel />

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
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
        </div>
      </div>
    </PageContainer>
  );
}
