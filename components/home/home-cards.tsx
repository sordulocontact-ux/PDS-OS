import { CardRow, ListCard } from "@/components/ui/list-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDay } from "@/lib/assistant/facts";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import type { ActivityEvent } from "@/lib/insights/activity";
import type { ReleaseOverview } from "@/lib/insights/releases";
import type { Todo } from "@/lib/insights/todo";
import type { ProjectListItem } from "@/lib/projects/types";
import {
  myValidationTone,
  onlineTone,
  overdueTone,
  projectStatusTone,
} from "@/lib/ui/state-tones";

const t = fr.assistant.cards;
const MAX = 5;

// `all` (work page): every row, with the count next to the title. The home
// shows the first rows only.
const shown = <T,>(rows: T[], all?: boolean) =>
  all ? rows : rows.slice(0, MAX);
const countOf = (rows: unknown[], all?: boolean) =>
  all ? rows.length : undefined;

export function TasksCard({
  tasks,
  all,
}: {
  tasks: Todo["tasks"];
  all?: boolean;
}) {
  return (
    <ListCard
      title={t.tasks}
      count={countOf(tasks, all)}
      empty={tasks.length ? undefined : t.tasksEmpty}
    >
      {shown(tasks, all).map((task) => (
        <CardRow
          key={task.id}
          href={task.href}
          main={task.title}
          sub={`${task.projectTitle} · ${task.dueDate ? t.due(formatDay(task.dueDate)) : t.noDue}`}
          badge={
            task.overdue ? (
              <StatusBadge tone={overdueTone} size="sm">
                {t.overdue}
              </StatusBadge>
            ) : undefined
          }
        />
      ))}
    </ListCard>
  );
}

export function ValidationsCard({
  validations,
  all,
}: {
  validations: Todo["validations"];
  all?: boolean;
}) {
  return (
    <ListCard
      title={t.validations}
      count={countOf(validations, all)}
      empty={validations.length ? undefined : t.validationsEmpty}
    >
      {shown(validations, all).map((v) => (
        <CardRow
          key={v.id}
          href={v.href}
          main={`${v.projectTitle} · ${v.stageLabel}`}
          sub={formatDay(v.requestedAt)}
          badge={
            <StatusBadge tone={myValidationTone} size="sm">
              {t.toValidate}
            </StatusBadge>
          }
        />
      ))}
    </ListCard>
  );
}

export function ProposalsCard({
  proposals,
  all,
}: {
  proposals: Todo["proposals"];
  all?: boolean;
}) {
  return (
    <ListCard
      title={t.proposals}
      count={countOf(proposals, all)}
      empty={proposals.length ? undefined : t.proposalsEmpty}
    >
      {shown(proposals, all).map((p) => (
        <CardRow
          key={p.projectId}
          href={p.href}
          main={p.projectTitle}
          badge={
            <StatusBadge tone="warning" size="sm">
              {t.proposalsCount(p.count)}
            </StatusBadge>
          }
        />
      ))}
    </ListCard>
  );
}

export function ActivityCard({ events }: { events: ActivityEvent[] }) {
  return (
    <ListCard
      title={t.activity}
      empty={events.length ? undefined : t.activityEmpty}
    >
      {events.slice(0, MAX).map((e, i) => (
        <CardRow
          key={`${e.at}-${i}`}
          href={e.href}
          main={`${e.projectTitle} · ${fr.assistant.activityKinds[e.kind] ?? e.kind}`}
          sub={`${formatDay(e.at)} · ${e.detail}`}
        />
      ))}
    </ListCard>
  );
}

export function ProjectsCard({ projects }: { projects: ProjectListItem[] }) {
  return (
    <ListCard
      title={t.projects}
      action={{ label: t.allProjects, href: routes.projects }}
      empty={projects.length ? undefined : t.projectsEmpty}
    >
      {projects.slice(0, MAX).map((p) => (
        <CardRow
          key={p.id}
          href={routes.project(p.id)}
          main={p.title}
          sub={`${p.artistName}${p.currentStage ? ` · ${p.currentStage.label} · ${fr.shell.stageStates[p.currentStage.state]}` : ""}`}
        />
      ))}
    </ListCard>
  );
}

export function ReleasesCard({ releases }: { releases: ReleaseOverview[] }) {
  return (
    <ListCard
      title={t.releases}
      empty={releases.length ? undefined : t.releasesEmpty}
    >
      {releases.map((r) => (
        <CardRow
          key={r.href}
          href={r.href}
          main={r.title}
          sub={r.plannedDate ? t.planned(formatDay(r.plannedDate)) : undefined}
          badge={
            <StatusBadge tone={onlineTone(Boolean(r.onlineSince))} size="sm">
              {r.onlineSince ? `${t.online} · ${r.platforms}` : t.notOnline}
            </StatusBadge>
          }
        />
      ))}
    </ListCard>
  );
}

// Projects in the handover circuit (to accept, to transmit again, waiting for
// a project manager). The home shows it only when there is something to do.
export function HandoverCard({
  title,
  projects,
  empty,
  all,
}: {
  title: string;
  projects: ProjectListItem[];
  empty?: string;
  all?: boolean;
}) {
  return (
    <ListCard
      title={title}
      count={countOf(projects, all)}
      empty={projects.length ? undefined : empty}
    >
      {shown(projects, all).map((p) => (
        <CardRow
          key={p.id}
          href={routes.project(p.id)}
          main={p.title}
          sub={p.artistName || undefined}
          badge={
            <StatusBadge tone={projectStatusTone[p.status]} size="sm">
              {fr.transmission.statuses[p.status]}
            </StatusBadge>
          }
        />
      ))}
    </ListCard>
  );
}
