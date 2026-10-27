import { ContentCard } from "@/components/shell/content-card";
import { LinkRow, Rows } from "@/components/ui/rows";
import { projectShell } from "@/lib/i18n/fr/project-shell";
import type { ProjectAction } from "@/lib/journey/types";
import { actionHref } from "@/lib/ui/journey";
import { formatShortDay } from "@/lib/utils/day";

const fr = { projectShell };

/**
 * The viewer's actions in a project (proto « Projet complet », `workPage`),
 * one row each: the action, « Workflow › Étape · avant le … », a chevron;
 * the row opens the step, on the gesture when it has its section. Travail lists them all, Validations the decisions.
 * Read from the journeys (lib/overview/journeys.ts), the Cadrage first.
 */
export function MyActions({
  actions,
  empty,
}: {
  actions: ProjectAction[];
  empty: string;
}) {
  const t = fr.projectShell.work;
  return (
    <ContentCard label={t.listLabel}>
      {actions.length === 0 ? (
        <p className="text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)]">
          {empty}
        </p>
      ) : (
        <Rows label={t.listLabel}>
          {actions.map((action) => (
            <LinkRow
              key={`${action.place}|${action.step.key}|${action.step.href}`}
              href={actionHref(action.step)}
              title={action.step.actor?.todo ?? action.step.title}
              detail={[
                `${action.place} › ${action.step.title}`,
                action.step.due
                  ? t.due(formatShortDay(action.step.due, { bare: true }))
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            />
          ))}
        </Rows>
      )}
    </ContentCard>
  );
}
