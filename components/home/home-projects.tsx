import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableLink,
  DataTableMedia,
  DataTableRow,
} from "@/components/ui/data-table";
import { ListCard } from "@/components/ui/list-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { routes } from "@/lib/auth/redirects";
import type { HomeProject } from "@/lib/home/feed";
import { shell } from "@/lib/i18n/fr/shell";
import { transmission } from "@/lib/i18n/fr/transmission";
import { todayInParis } from "@/lib/insights/dates";
import { projectFormatLabel } from "@/lib/projects/labels";
import { projectStatusTone } from "@/lib/ui/state-tones";
import { daysBetween } from "@/lib/utils/calendar-period";
import { formatDay } from "@/lib/utils/day";

const fr = { shell, transmission };

/** What the project asks of the viewer: its handover status before it is
 * launched, else their moves in it, else « Suivi ». */
function ForYou({ project, mine }: HomeProject) {
  const t = fr.shell.home.projects;
  if (project.status !== "launched")
    return (
      <StatusBadge tone={projectStatusTone[project.status]} size="sm">
        {fr.transmission.statuses[project.status]}
      </StatusBadge>
    );
  return mine > 0 ? (
    <StatusBadge tone="info" size="sm">
      {t.mine(mine)}
    </StatusBadge>
  ) : (
    <StatusBadge tone="neutral" size="sm">
      {t.followed}
    </StatusBadge>
  );
}

/**
 * « Vos projets » (proto `docs/protos/accueil.html`): one row per project,
 * the nearest due date first — its format and artist, who runs it (only
 * when it is not always the viewer), its due date and how far, what it asks
 * of the viewer. A row opens the project.
 */
export function HomeProjects({
  projects,
  viewerId,
  newProjectHref,
}: {
  projects: HomeProject[];
  viewerId: string | null;
  // The direction creates projects: its link when there is none.
  newProjectHref: string | null;
}) {
  const t = fr.shell.home.projects;
  const today = todayInParis();
  // The viewer runs them all: the column would repeat their own name.
  const responsible = projects.some(
    ({ project }) => project.responsiblePersonId !== viewerId,
  );
  return (
    <ListCard
      title={t.title}
      count={projects.length}
      list={false}
      empty={projects.length ? undefined : t.empty}
      action={
        projects.length === 0 && newProjectHref
          ? { label: fr.shell.projects.newProject, href: newProjectHref }
          : undefined
      }
    >
      <div className="px-2">
        <DataTable>
          <DataTableHeader>
            <DataTableHead fill>{t.columns.title}</DataTableHead>
            {responsible && (
              <DataTableHead hideBelow="md">
                {t.columns.responsible}
              </DataTableHead>
            )}
            <DataTableHead hideBelow="sm">{t.columns.due}</DataTableHead>
            <DataTableHead className="w-28" align="end">
              {t.columns.mine}
            </DataTableHead>
          </DataTableHeader>
          <DataTableBody>
            {projects.map((row) => {
              const { project } = row;
              const due = project.dueDate;
              return (
                <DataTableRow key={project.id}>
                  <DataTableCell fill>
                    <DataTableMedia
                      title={
                        <DataTableLink href={routes.project(project.id)}>
                          {project.title}
                        </DataTableLink>
                      }
                      subtitle={[
                        projectFormatLabel(project),
                        project.artistName,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    />
                    {/* Narrow screens: the due date under the title. */}
                    {due && (
                      <span className="text-caption text-[color:var(--text-tertiary)] tabular-nums sm:hidden">
                        {t.columns.due} {formatDay(due)}
                      </span>
                    )}
                  </DataTableCell>
                  {responsible && (
                    <DataTableCell hideBelow="md">
                      {project.responsibleName ?? "—"}
                    </DataTableCell>
                  )}
                  <DataTableCell hideBelow="sm" className="tabular-nums">
                    {due ? (
                      <span className="flex flex-col">
                        <span>{formatDay(due)}</span>
                        <span className="text-caption text-[color:var(--text-tertiary)]">
                          {t.inDays(daysBetween(today, due))}
                        </span>
                      </span>
                    ) : (
                      <span className="text-[color:var(--text-secondary)]">
                        {t.noDue}
                      </span>
                    )}
                  </DataTableCell>
                  <DataTableCell className="w-28" align="end">
                    <ForYou {...row} />
                  </DataTableCell>
                </DataTableRow>
              );
            })}
          </DataTableBody>
        </DataTable>
      </div>
    </ListCard>
  );
}
