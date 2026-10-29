import {
  HomeListNote,
  HomeRow,
  HomeSection,
} from "@/components/home/home-list";
import { StatusBadge } from "@/components/ui/status-badge";
import { routes } from "@/lib/auth/redirects";
import type { HomeProject } from "@/lib/home/feed";
import { shell } from "@/lib/i18n/fr/shell";
import { transmission } from "@/lib/i18n/fr/transmission";
import { todayInParis } from "@/lib/insights/dates";
import { projectFormatLabel } from "@/lib/projects/labels";
import { projectStatusTone } from "@/lib/ui/state-tones";
import { cn } from "@/lib/utils";
import { daysBetween } from "@/lib/utils/calendar-period";
import { formatDay } from "@/lib/utils/day";

const fr = { shell, transmission };

const caption =
  "text-[length:var(--type-caption)] leading-[var(--type-caption-lh)]";

// Projet · Responsable · Échéance · Pour vous; one column of text and the
// badge on a phone, the due date then under the title.
const columns = {
  withResponsible:
    "md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1.2fr)_7rem]",
  withoutResponsible: "md:grid-cols-[minmax(0,2.6fr)_minmax(0,1.2fr)_7rem]",
};
const grid = "grid flex-1 grid-cols-[minmax(0,1fr)_auto] items-center gap-4";

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
  const cols = responsible
    ? columns.withResponsible
    : columns.withoutResponsible;
  return (
    <HomeSection
      title={t.title}
      count={projects.length}
      action={
        projects.length === 0 && newProjectHref
          ? { label: fr.shell.projects.newProject, href: newProjectHref }
          : undefined
      }
    >
      {projects.length === 0 ? (
        <HomeListNote>{t.empty}</HomeListNote>
      ) : (
        <li
          aria-hidden
          className={cn(
            caption,
            "hidden items-center gap-3 px-4 py-2 text-[color:var(--text-tertiary)] md:flex",
          )}
        >
          <span className={cn(grid, cols)}>
            <span>{t.columns.title}</span>
            {responsible && <span>{t.columns.responsible}</span>}
            <span>{t.columns.due}</span>
            <span className="text-right">{t.columns.mine}</span>
          </span>
          {/* The chevron's place. */}
          <span className="size-4 shrink-0" />
        </li>
      )}
      {projects.map((row) => {
        const { project } = row;
        const due = project.dueDate;
        const sub = [projectFormatLabel(project), project.artistName]
          .filter(Boolean)
          .join(" · ");
        return (
          <HomeRow key={project.id} href={routes.project(project.id)}>
            <span className={cn(grid, cols)}>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="font-semibold break-words">
                  {project.title}
                </span>
                {sub && (
                  <span
                    className={cn(
                      caption,
                      "break-words text-[color:var(--text-secondary)]",
                    )}
                  >
                    {sub}
                  </span>
                )}
                {due && (
                  <span
                    className={cn(
                      caption,
                      "text-[color:var(--text-secondary)] tabular-nums md:hidden",
                    )}
                  >
                    {t.columns.due} {formatDay(due)}
                  </span>
                )}
              </span>
              {responsible && (
                <span className="hidden min-w-0 break-words md:block">
                  {project.responsibleName ?? "—"}
                </span>
              )}
              <span className="hidden flex-col tabular-nums md:flex">
                {due ? (
                  <>
                    <span>{formatDay(due)}</span>
                    <span
                      className={cn(
                        caption,
                        "text-[color:var(--text-secondary)]",
                      )}
                    >
                      {t.inDays(daysBetween(today, due))}
                    </span>
                  </>
                ) : (
                  <span className="text-[color:var(--text-secondary)]">
                    {t.noDue}
                  </span>
                )}
              </span>
              <span className="flex justify-end">
                <ForYou {...row} />
              </span>
            </span>
          </HomeRow>
        );
      })}
    </HomeSection>
  );
}
