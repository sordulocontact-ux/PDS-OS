import { UserPlusIcon } from "lucide-react";
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
import { PageHeader } from "@/components/shell/page-header";
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

  return (
    <PageContainer>
      <PageHeader
        title={
          access.firstName ? t.welcome(access.firstName) : t.welcomeAnonymous
        }
        description={t.body}
      />

      {pendingCount > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-sm">
            <UserPlusIcon
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
        <ValidationsCard validations={todo.validations} />
        <ProposalsCard proposals={todo.proposals} />
        <ProjectsCard projects={projects} />
        <ActivityCard events={events} />
        <ReleasesCard releases={releases} />
      </div>
    </PageContainer>
  );
}
