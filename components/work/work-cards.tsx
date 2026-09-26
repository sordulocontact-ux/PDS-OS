import { StatusBadge } from "@/components/ui/status-badge";
import { CardRow, ListCard } from "@/components/ui/list-card";
import { formatDay } from "@/lib/assistant/facts";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import type { ProjectListItem } from "@/lib/projects/types";
import { overdueTone, stageTone } from "@/lib/ui/state-tones";
import type { OwnedProject, WorkDeliverable } from "@/lib/work/queries";

const t = fr.work;

// Launched projects the viewer runs, each with the next thing to do (code).
// The project manager's main card: two columns wide, so the action reads whole.
export function OwnedProjectsCard({ projects }: { projects: OwnedProject[] }) {
  return (
    <ListCard
      className="md:col-span-2"
      title={t.cards.ownedProjects}
      count={projects.length}
      empty={projects.length ? undefined : t.cards.ownedProjectsEmpty}
    >
      {projects.map(({ project, action }) => {
        const stage = project.currentStage;
        return (
          <CardRow
            key={project.id}
            href={action.href}
            main={project.title}
            sub={
              stage
                ? `${stage.label} · ${t.nextActions[action.kind]}`
                : t.nextActions[action.kind]
            }
            badge={
              <StatusBadge
                tone={stage ? stageTone[stage.state] : "success"}
                size="sm"
              >
                {stage ? fr.shell.stageStates[stage.state] : t.allValidated}
              </StatusBadge>
            }
          />
        );
      })}
    </ListCard>
  );
}

// Strategy deliverables: the viewer's to design, or the owner's to staff.
export function DeliverablesCard({
  title,
  empty,
  deliverables,
}: {
  title: string;
  empty: string;
  deliverables: WorkDeliverable[];
}) {
  return (
    <ListCard
      title={title}
      count={deliverables.length}
      empty={deliverables.length ? undefined : empty}
    >
      {deliverables.map((d) => (
        <CardRow
          key={d.id}
          href={d.href}
          main={d.title}
          sub={[
            d.projectTitle,
            d.dueDate
              ? fr.assistant.cards.due(formatDay(d.dueDate))
              : t.noDueDate,
            ...(d.hasAssignee ? [] : [t.noAssignee]),
          ].join(" · ")}
          badge={
            d.overdue ? (
              <StatusBadge tone={overdueTone} size="sm">
                {fr.assistant.cards.overdue}
              </StatusBadge>
            ) : undefined
          }
        />
      ))}
    </ListCard>
  );
}

// Launched projects of the viewer's creative team; Conception is flagged.
export function CreativeProjectsCard({
  projects,
}: {
  projects: ProjectListItem[];
}) {
  return (
    <ListCard
      title={t.cards.creativeProjects}
      count={projects.length}
      empty={projects.length ? undefined : t.cards.creativeProjectsEmpty}
    >
      {projects.map((p) => {
        const stage = p.currentStage;
        return (
          <CardRow
            key={p.id}
            href={routes.project(p.id)}
            main={p.title}
            sub={[p.artistName, stage?.label ?? t.allValidated]
              .filter(Boolean)
              .join(" · ")}
            badge={
              stage?.key === "design" ? (
                <StatusBadge tone={stageTone[stage.state]} size="sm">
                  {t.inDesign}
                </StatusBadge>
              ) : undefined
            }
          />
        );
      })}
    </ListCard>
  );
}
