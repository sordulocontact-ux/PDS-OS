import { UserPlusIcon } from "lucide-react";
import Link from "next/link";

import { AssistantPanel } from "@/components/assistant/assistant-panel";
import {
  ActivityCard,
  ProjectsCard,
  ProposalsCard,
  ReleasesCard,
  TasksCard,
  ValidationsCard,
} from "@/components/home/home-cards";
import { PageContainer } from "@/components/shell/page-container";
import { PageHeader } from "@/components/shell/page-header";
import { buttonVariants } from "@/components/ui/button";
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
      access.role === "admin" && access.organizationId
        ? countPendingMemberships(access.organizationId)
        : Promise.resolve(0),
      loadMyTodo(access),
      loadRecentActivity({ days: 7, limit: 5 }),
      listProjects(),
      loadReleasesOverview(),
    ]);

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
