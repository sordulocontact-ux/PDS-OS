import {
  HomeListNote,
  HomeRow,
  HomeSection,
} from "@/components/home/home-list";
import { titleOf } from "@/components/work/work-row";
import { StatusBadge } from "@/components/ui/status-badge";
import { MarkedText } from "@/components/ui/marked-text";
import { routes } from "@/lib/auth/redirects";
import type { HomeProject } from "@/lib/home/feed";
import { shell } from "@/lib/i18n/fr/shell";
import { transmission } from "@/lib/i18n/fr/transmission";
import { work } from "@/lib/i18n/fr/work";
import { todayInParis } from "@/lib/insights/dates";
import { projectFormatLabel } from "@/lib/projects/labels";
import { projectStatusTone } from "@/lib/ui/state-tones";
import { cn } from "@/lib/utils";
import { daysBetween } from "@/lib/utils/calendar-period";
import { formatDay } from "@/lib/utils/day";
import type { WorkRow } from "@/lib/work/rows";

const fr = { shell, transmission, work };

const caption =
  "text-[length:var(--type-caption)] leading-[var(--type-caption-lh)]";
const secondary = "text-[color:var(--text-secondary)]";

// Projet · Responsable · Échéance · Pour vous; on a phone, the title's
// column and a badge, the due date and the action under the title.
const columns = {
  withResponsible:
    "md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.5fr)]",
  withoutResponsible:
    "md:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)_minmax(0,1.6fr)]",
};
const grid = "grid flex-1 grid-cols-[minmax(0,1fr)_auto] items-center gap-4";

/** « Valider le Mix V1 +3 »: the most pressing move and how many follow. */
function NextAction({ next, mine }: { next: WorkRow; mine: number }) {
  return (
    <>
      <span className="font-semibold break-words">
        <MarkedText text={titleOf(next)} />
      </span>
      {mine > 1 && (
        <span className={cn(caption, secondary)}>
          {" "}
          {fr.shell.home.projects.more(mine - 1)}
        </span>
      )}
    </>
  );
}

/** Nothing for the viewer: the handover status before the project is
 * launched, else « Suivi ». */
function Status({ project }: HomeProject) {
  return project.status !== "launched" ? (
    <StatusBadge tone={projectStatusTone[project.status]} size="sm">
      {fr.transmission.statuses[project.status]}
    </StatusBadge>
  ) : (
    <StatusBadge tone="neutral" size="sm">
      {fr.shell.home.projects.followed}
    </StatusBadge>
  );
}

/**
 * « Vos projets » (proto `docs/protos/accueil.html`): one row per project,
 * the nearest due date first — its format and artist, who runs it (only
 * when it is not always the viewer), its due date and how far, and what it
 * asks of the viewer: the most pressing of their moves in it (Sacha 29/10:
 * a count, « 2 à vous », said nothing), which the row opens; else its status
 * and the row opens the project.
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
            <span>{t.columns.mine}</span>
          </span>
          {/* The chevron's place. */}
          <span className="size-4 shrink-0" />
        </li>
      )}
      {projects.map((row) => {
        const { project, next, mine } = row;
        const due = project.dueDate;
        const sub = [projectFormatLabel(project), project.artistName]
          .filter(Boolean)
          .join(" · ");
        return (
          <HomeRow
            key={project.id}
            href={next?.href ?? routes.project(project.id)}
          >
            <span className={cn(grid, cols)}>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="font-semibold break-words">
                  {project.title}
                </span>
                {sub && (
                  <span className={cn(caption, secondary, "break-words")}>
                    {sub}
                  </span>
                )}
                {due && (
                  <span
                    className={cn(caption, secondary, "tabular-nums md:hidden")}
                  >
                    {t.columns.due} {formatDay(due)}
                  </span>
                )}
                {next && (
                  <span className={cn(caption, secondary, "md:hidden")}>
                    {t.mineLabel}
                    <span className="text-foreground">
                      <NextAction next={next} mine={mine} />
                    </span>
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
                    <span className={cn(caption, secondary)}>
                      {t.inDays(daysBetween(today, due))}
                    </span>
                  </>
                ) : (
                  <span className={secondary}>{t.noDue}</span>
                )}
              </span>
              {next ? (
                <span className="hidden min-w-0 flex-col md:flex">
                  <span>
                    <NextAction next={next} mine={mine} />
                  </span>
                  {next.overdue ? (
                    <span className={cn(caption, "text-error")}>
                      {fr.work.journeys.overdue}
                    </span>
                  ) : (
                    next.due && (
                      <span className={cn(caption, secondary)}>
                        {fr.work.lead.due(formatDay(next.due))}
                      </span>
                    )
                  )}
                </span>
              ) : (
                <span className="flex">
                  <Status {...row} />
                </span>
              )}
            </span>
          </HomeRow>
        );
      })}
    </HomeSection>
  );
}
