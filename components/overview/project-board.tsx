import { IconDrawCompass } from "nucleo-sharp-essential";

import { BlockersCard } from "@/components/overview/blockers-card";
import {
  DeadlinesCard,
  NextActionsCard,
} from "@/components/overview/board-cards";
import { DependenciesTable } from "@/components/overview/dependencies-table";
import { WorkflowCards } from "@/components/overview/workflow-cards";
import { ViewLink } from "@/components/ui/view-link";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { formatDate } from "@/lib/release/format";
import {
  boardActions,
  boardBlockers,
  boardDeadlines,
} from "@/lib/workflow-status/board";
import type { WorkflowStates } from "@/lib/workflow-status/load";

/**
 * The overview of a project whose plan runs (ticket « Architecture
 * globale », § 2): the Cadrage above everything, the workflows side by
 * side, then what to do next, what blocks and what is due, and what each
 * workflow expects from another. Everything is
 * read from the workflows themselves (lib/workflow-status/), so a change in
 * a workflow shows here without being entered twice.
 */
export function ProjectBoard({
  project,
  flows,
  today,
  canLaunch,
}: {
  project: {
    id: string;
    dueDate: string | null;
    stages: Array<{
      key: string;
      state: string;
      stateChangedAt: string | null;
    }>;
  };
  flows: WorkflowStates;
  today: string;
  canLaunch: boolean;
}) {
  const t = fr.workflowStatus.board;
  const input = {
    projectId: project.id,
    today,
    projectDueDate: project.dueDate,
    workflows: flows.workflows,
    states: flows.states,
    dependencies: flows.dependencies,
    details: flows.details,
  };
  const framing = project.stages.find((stage) => stage.key === "framing");
  const absent = (["master", "legal", "marketing", "distribution"] as const)
    .filter((workflow) => !flows.workflows.includes(workflow))
    .map((workflow) => fr.shell.project.sidebar[workflow]);

  return (
    <div className="flex flex-col gap-6">
      <ViewLink
        href={routes.projectFraming(project.id)}
        className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl bg-[var(--surface-soft)] px-4 py-3 no-underline transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-[var(--surface-sunken)]"
      >
        <IconDrawCompass aria-hidden className="size-5 shrink-0" />
        <span className="text-body-md font-semibold">{t.framing}</span>
        {framing?.state === "validated" && framing.stateChangedAt && (
          <span className="text-body-md text-muted-foreground">
            {t.framingValidated(formatDate(framing.stateChangedAt))}
          </span>
        )}
        <span className="ml-auto text-caption text-muted-foreground underline-offset-4">
          {t.framingOpen}
        </span>
      </ViewLink>

      <WorkflowCards
        projectId={project.id}
        workflows={flows.workflows}
        states={flows.states}
        legalDone={flows.legalDone}
        canLaunch={canLaunch}
      />
      {absent.length > 0 && (
        <p className="text-caption text-muted-foreground">
          {t.notApplicable(absent.join(" et "))}
        </p>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <NextActionsCard actions={boardActions(input)} />
        <div className="flex min-w-0 flex-col gap-4">
          <BlockersCard blockers={boardBlockers(input)} />
          <DeadlinesCard deadlines={boardDeadlines(input)} />
        </div>
      </div>

      <DependenciesTable deps={flows.dependencies} />
    </div>
  );
}
