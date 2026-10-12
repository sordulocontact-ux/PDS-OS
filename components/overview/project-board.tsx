import { IconDrawCompass } from "nucleo-sharp-essential";

import { BlockersCard } from "@/components/overview/blockers-card";
import {
  DeadlinesCard,
  NextActionsCard,
} from "@/components/overview/board-cards";
import { DependenciesTable } from "@/components/overview/dependencies-table";
import { WorkflowCards } from "@/components/overview/workflow-cards";
import { buttonVariants } from "@/components/ui/button";
import { ViewLink } from "@/components/ui/view-link";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { projectDateLabel } from "@/lib/projects/labels";
import type { ProjectType } from "@/lib/projects/types";
import { formatDate } from "@/lib/release/format";
import {
  boardActions,
  boardBlockers,
  boardDeadlines,
} from "@/lib/workflow-status/board";
import type { LaunchedPlan } from "@/lib/plan/queries";
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
  plan,
}: {
  project: {
    id: string;
    type: ProjectType;
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
  plan?: LaunchedPlan;
}) {
  const pilotOf = (w: "strategy" | "master" | "legal") =>
    plan?.items.find((i) => i.workflow === w)?.ownerName ?? null;
  const t = fr.workflowStatus.board;
  const input = {
    projectId: project.id,
    today,
    projectDueDate: project.dueDate,
    projectDateLabel: projectDateLabel(project.type),
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
      {/* The whole band opens the Cadrage (stretched link); « Voir le
          Brief » sits above it and opens the Brief itself. */}
      <div className="relative flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl bg-[var(--surface-soft)] px-4 py-3 transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-[var(--surface-sunken)] has-[>a:focus-visible]:ring-3 has-[>a:focus-visible]:ring-ring/50">
        <IconDrawCompass aria-hidden className="size-5 shrink-0" />
        <ViewLink
          href={routes.projectFraming(project.id)}
          className="text-body-md font-semibold no-underline outline-none after:absolute after:inset-0 after:rounded-2xl"
        >
          {t.framing}
        </ViewLink>
        {framing?.state === "validated" && framing.stateChangedAt && (
          <span className="text-body-md text-muted-foreground">
            {t.framingValidated(formatDate(framing.stateChangedAt))}
          </span>
        )}
        <span className="ml-auto flex items-center gap-3">
          <ViewLink
            href={routes.projectFramingBrief(project.id)}
            className={buttonVariants({
              size: "sm",
              variant: "outline",
              className: "relative z-10",
            })}
          >
            {t.seeBrief}
          </ViewLink>
          <span aria-hidden className="text-caption text-muted-foreground">
            {t.framingOpen}
          </span>
        </span>
      </div>

      <WorkflowCards
        projectId={project.id}
        workflows={flows.workflows}
        states={flows.states}
        legalDone={flows.legalDone}
        canLaunch={canLaunch}
        pilots={{
          strategy: pilotOf("strategy"),
          master: pilotOf("master"),
          legal: pilotOf("legal"),
        }}
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
