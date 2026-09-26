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
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { loadRecentActivity } from "@/lib/insights/activity";
import { loadReleasesOverview } from "@/lib/insights/releases";
import { loadMyTodo } from "@/lib/insights/todo";
import { handoverOf } from "@/lib/projects/handover";
import { listProjects } from "@/lib/projects/queries";

export default async function AppHomePage() {
  const access = await requireApproved();
  const t = fr.shell.home;
  const [todo, events, { projects }, releases] = await Promise.all([
    loadMyTodo(access),
    loadRecentActivity({ days: 7, limit: 5 }),
    listProjects(),
    loadReleasesOverview(),
  ]);

  const { toAccept, toRetransmit } = handoverOf(projects, access);

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
