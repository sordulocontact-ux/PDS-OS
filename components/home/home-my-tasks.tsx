import {
  HomeListNote,
  HomeRow,
  HomeRowText,
  HomeSection,
} from "@/components/home/home-list";
import { StatusBadge } from "@/components/ui/status-badge";
import { MarkedText } from "@/components/ui/marked-text";
import { QuadrantBadge } from "@/components/work/my-task-row";
import { routes } from "@/lib/auth/redirects";
import { work } from "@/lib/i18n/fr/work";
import { isOverdue } from "@/lib/insights/dates";
import { overdueTone } from "@/lib/ui/state-tones";
import { formatShortDay } from "@/lib/utils/day";
import { quadrantOf, type PersonalTask } from "@/lib/work/personal-tasks";

const fr = { work };

// As « Aussi à vous »: a few rows, the rest one click away.
const MAX = 3;

/**
 * « Vos tâches » on the home (lot 5 of the retour du 31/10/2026, « des
 * notifications aussi sur l'accueil »): the viewer's own urgent tasks, late
 * first, and how many actions of their meetings wait to be sorted. Each row
 * opens « Mes tâches ». Nothing when there is neither.
 */
export function HomeMyTasks({
  tasks,
  suggestions,
  today,
}: {
  tasks: PersonalTask[];
  suggestions: number;
  today: string;
}) {
  if (tasks.length === 0 && suggestions === 0) return null;
  const t = fr.work.tasks;
  const href = routes.workTasks;
  return (
    <HomeSection
      title={t.home.title}
      count={tasks.length || undefined}
      action={{ label: t.home.all, href }}
    >
      {suggestions > 0 && (
        <HomeRow href={href}>
          <HomeRowText
            main={
              <span className="font-semibold">
                {t.home.suggestions(suggestions)}
              </span>
            }
            sub={t.home.suggestionsSub}
          />
        </HomeRow>
      )}
      {tasks.slice(0, MAX).map((task) => {
        const late = task.dueDate !== null && isOverdue(task.dueDate, today);
        const when = task.dueDate
          ? t.home.due(formatShortDay(task.dueDate, { bare: true }))
          : t.noDue;
        return (
          <HomeRow
            key={task.id}
            href={href}
            badges={
              <>
                {late && (
                  <StatusBadge tone={overdueTone} size="sm">
                    {t.overdue}
                  </StatusBadge>
                )}
                <QuadrantBadge quadrant={quadrantOf(task, today)} />
              </>
            }
          >
            <HomeRowText
              main={
                <span className="font-semibold">
                  <MarkedText text={task.title} />
                </span>
              }
              sub={[when, task.source && t.fromCall(task.source.callTitle)]
                .filter(Boolean)
                .join(" · ")}
            />
          </HomeRow>
        );
      })}
      {tasks.length > MAX && (
        <HomeListNote>{t.home.more(tasks.length - MAX)}</HomeListNote>
      )}
    </HomeSection>
  );
}
