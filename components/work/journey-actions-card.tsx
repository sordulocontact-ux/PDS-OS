import { CardRow, ListCard } from "@/components/ui/list-card";
import { LoadingRegion, Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { auth } from "@/lib/i18n/fr/auth";
import { work } from "@/lib/i18n/fr/work";
import type { ProjectAction } from "@/lib/journey/types";
import { actionHref } from "@/lib/ui/journey";
import { myValidationTone, overdueTone } from "@/lib/ui/state-tones";
import { formatShortDay } from "@/lib/utils/day";

const fr = { auth, work };

export type JourneyActionRow = {
  action: ProjectAction;
  // Given when the card mixes projects (the home's « À vous »).
  projectTitle?: string;
};

const MAX = 5;

/**
 * The viewer's actions read from the projects' journeys (lib/work/
 * journeys.ts), one row each: the action, « Projet · Workflow › Étape ·
 * avant le … », « À valider » on a decision; the row opens the step, on the gesture
 * when the step shows it at its head (`actionHref`). The
 * global Travail shows one card per project (`all`: every row, counted),
 * the home one card for everything (first rows, `action` to the Travail).
 */
export function JourneyActionsCard({
  title,
  rows,
  empty,
  all,
  action,
  error,
}: {
  title: string;
  rows: JourneyActionRow[];
  empty: string;
  all?: boolean;
  action?: { label: string; href: string };
  error?: string;
}) {
  const t = fr.work.journeys;
  return (
    <ListCard
      title={title}
      count={all ? rows.length : undefined}
      action={action}
      empty={rows.length ? undefined : empty}
      error={error}
    >
      {(all ? rows : rows.slice(0, MAX)).map(({ action: a, projectTitle }) => (
        <CardRow
          key={`${projectTitle ?? ""}|${a.place}|${a.step.key}|${a.step.href}`}
          href={actionHref(a.step)}
          main={a.step.actor?.todo ?? a.step.title}
          sub={[
            projectTitle,
            `${a.place} › ${a.step.title}`,
            a.step.due
              ? t.due(formatShortDay(a.step.due, { bare: true }))
              : null,
          ]
            .filter(Boolean)
            .join(" · ")}
          badge={
            a.step.actor?.kind === "validate" ? (
              <StatusBadge tone={myValidationTone} size="sm">
                {t.toValidate}
              </StatusBadge>
            ) : a.step.alert === "overdue" ? (
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

/** A card's place in the grid while the projects' journeys are read (the
 * home's and the Travail's journey cards stream on their own). */
export function JourneyCardsSkeleton() {
  return (
    <LoadingRegion label={fr.auth.common.loading}>
      <Skeleton className="h-48 rounded-2xl" />
    </LoadingRegion>
  );
}
