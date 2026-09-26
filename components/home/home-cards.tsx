import { CardRow, HomeCard } from "@/components/home/home-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDay } from "@/lib/assistant/facts";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import type { ActivityEvent } from "@/lib/insights/activity";
import type { ReleaseOverview } from "@/lib/insights/releases";
import type { Todo } from "@/lib/insights/todo";
import type { ProjectListItem } from "@/lib/projects/types";
import {
  onlineTreatment,
  overdueTreatment,
  projectStatusTreatment,
} from "@/lib/ui/state-treatments";

const t = fr.assistant.cards;
const MAX = 5;

export function TasksCard({ tasks }: { tasks: Todo["tasks"] }) {
  return (
    <HomeCard title={t.tasks} empty={tasks.length ? undefined : t.tasksEmpty}>
      <ul className="grid">
        {tasks.slice(0, MAX).map((task) => (
          <CardRow
            key={task.id}
            href={task.href}
            main={task.title}
            sub={`${task.projectTitle} · ${t.due(formatDay(task.dueDate))}`}
            badge={
              task.overdue ? (
                <StatusBadge treatment={overdueTreatment} size="sm">
                  {t.overdue}
                </StatusBadge>
              ) : undefined
            }
          />
        ))}
      </ul>
    </HomeCard>
  );
}

export function ValidationsCard({
  validations,
}: {
  validations: Todo["validations"];
}) {
  return (
    <HomeCard
      title={t.validations}
      empty={validations.length ? undefined : t.validationsEmpty}
    >
      <ul className="grid">
        {validations.slice(0, MAX).map((v) => (
          <CardRow
            key={v.id}
            href={v.href}
            main={`${v.projectTitle} · ${v.stageLabel}`}
            sub={formatDay(v.requestedAt)}
          />
        ))}
      </ul>
    </HomeCard>
  );
}

export function ProposalsCard({ proposals }: { proposals: Todo["proposals"] }) {
  return (
    <HomeCard
      title={t.proposals}
      empty={proposals.length ? undefined : t.proposalsEmpty}
    >
      <ul className="grid">
        {proposals.slice(0, MAX).map((p) => (
          <CardRow
            key={p.projectId}
            href={p.href}
            main={p.projectTitle}
            badge={
              <StatusBadge treatment="pending" size="sm">
                {t.proposalsCount(p.count)}
              </StatusBadge>
            }
          />
        ))}
      </ul>
    </HomeCard>
  );
}

export function ActivityCard({ events }: { events: ActivityEvent[] }) {
  return (
    <HomeCard
      title={t.activity}
      empty={events.length ? undefined : t.activityEmpty}
    >
      <ul className="grid">
        {events.slice(0, MAX).map((e, i) => (
          <CardRow
            key={`${e.at}-${i}`}
            href={e.href}
            main={`${e.projectTitle} · ${fr.assistant.activityKinds[e.kind] ?? e.kind}`}
            sub={`${formatDay(e.at)} · ${e.detail}`}
          />
        ))}
      </ul>
    </HomeCard>
  );
}

export function ProjectsCard({ projects }: { projects: ProjectListItem[] }) {
  return (
    <HomeCard
      title={t.projects}
      action={{ label: t.allProjects, href: routes.projects }}
      empty={projects.length ? undefined : t.projectsEmpty}
    >
      <ul className="grid">
        {projects.slice(0, MAX).map((p) => (
          <CardRow
            key={p.id}
            href={routes.project(p.id)}
            main={p.title}
            sub={`${p.artistName}${p.currentStage ? ` · ${p.currentStage.label} · ${fr.shell.stageStates[p.currentStage.state]}` : ""}`}
          />
        ))}
      </ul>
    </HomeCard>
  );
}

export function ReleasesCard({ releases }: { releases: ReleaseOverview[] }) {
  return (
    <HomeCard
      title={t.releases}
      empty={releases.length ? undefined : t.releasesEmpty}
    >
      <ul className="grid">
        {releases.map((r) => (
          <CardRow
            key={r.href}
            href={r.href}
            main={r.title}
            sub={
              r.plannedDate ? t.planned(formatDay(r.plannedDate)) : undefined
            }
            badge={
              <StatusBadge
                treatment={onlineTreatment(Boolean(r.onlineSince))}
                size="sm"
              >
                {r.onlineSince ? `${t.online} · ${r.platforms}` : t.notOnline}
              </StatusBadge>
            }
          />
        ))}
      </ul>
    </HomeCard>
  );
}

// Projects waiting on the viewer in the handover circuit (to accept, or to
// transmit again). Shown only when there is something to do.
export function HandoverCard({
  title,
  projects,
}: {
  title: string;
  projects: ProjectListItem[];
}) {
  return (
    <HomeCard title={title}>
      <ul className="grid">
        {projects.slice(0, MAX).map((p) => (
          <CardRow
            key={p.id}
            href={routes.project(p.id)}
            main={p.title}
            sub={p.artistName || undefined}
            badge={
              <StatusBadge
                treatment={projectStatusTreatment[p.status]}
                size="sm"
              >
                {fr.transmission.statuses[p.status]}
              </StatusBadge>
            }
          />
        ))}
      </ul>
    </HomeCard>
  );
}
