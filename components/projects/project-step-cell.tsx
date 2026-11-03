import { EMPTY_CELL } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { shell } from "@/lib/i18n/fr/shell";
import { phaseLabel } from "@/lib/projects/list-view";
import type { ProjectListItem } from "@/lib/projects/types";
import { moduleHue, stageHue } from "@/lib/ui/category-hues";

const fr = { shell };

/**
 * The « Étape » of a project in the list. Launched, it is at several
 * workflows at once (Master, Juridique, Marketing side by side, Sacha
 * 03/11/2026): one pill each, « Workflow · step », in the workflow's hue.
 * Before the plan, its one step (the Cadrage). A finished project says so
 * once, in Statut.
 */
export function ProjectStepCell({ project }: { project: ProjectListItem }) {
  const active = project.activeWorkflows ?? [];
  if (active.length > 0)
    return (
      <ul className="flex flex-wrap gap-1">
        {active.map(({ workflow, step }) => (
          <li key={workflow}>
            <StatusBadge tone={moduleHue[workflow]} size="sm">
              {fr.shell.projects.workflowStep(
                fr.shell.project.sidebar[workflow],
                step,
              )}
            </StatusBadge>
          </li>
        ))}
      </ul>
    );
  const phase = phaseLabel(project);
  if (!phase || !project.currentStage) return EMPTY_CELL;
  return (
    <StatusBadge tone={stageHue(project.currentStage.key)} size="sm">
      {phase}
    </StatusBadge>
  );
}
