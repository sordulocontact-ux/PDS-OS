import { NowFrame } from "@/components/shell/journey/now-card";
import { buttonVariants, ButtonRoll } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { MarkedText } from "@/components/ui/marked-text";
import { ViewLink } from "@/components/ui/view-link";
import { work } from "@/lib/i18n/fr/work";
import { overdueTone } from "@/lib/ui/state-tones";
import { cn } from "@/lib/utils";
import { formatDay } from "@/lib/utils/day";
import type { WorkRow } from "@/lib/work/rows";

import { ModuleTag, placeOf, ProjectTag, rowBadge, titleOf } from "./work-row";

const fr = { work };

const t = fr.work.lead;

const secondary =
  "text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)]";

/**
 * « Maintenant » of the Travail (docs/VISION-UX.md § 2): the most pressing of
 * the viewer's actions, answering the five questions — the action, why, who
 * validates, what it unlocks — and « Ouvrir » on the gesture. The list below
 * never repeats it. With nothing to do: « Rien à faire pour vous », and
 * `empty` says what else (the home of a new member: what will arrive here).
 */
export function WorkLead({
  row,
  empty,
}: {
  row: WorkRow | null;
  empty?: { title: string; body: string };
}) {
  if (!row)
    return (
      <NowFrame label={t.label}>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone="neutral">{t.nothing}</StatusBadge>
        </div>
        <h2 className="text-[length:var(--type-display-sm)] leading-[var(--type-display-sm-lh)] font-medium tracking-[var(--type-display-tracking)] text-balance">
          {empty?.title ?? t.allDone}
        </h2>
        <p className={cn(secondary, "text-pretty")}>
          {empty?.body ?? t.othersMove}
        </p>
      </NowFrame>
    );

  const badge = rowBadge(row);
  // The tags say the project and the module: what is left, where in it and
  // by when.
  const context = [placeOf(row), row.due ? t.due(formatDay(row.due)) : null]
    .filter(Boolean)
    .join(" · ");
  const facts = [
    row.validator ? { label: t.validator, value: row.validator } : null,
    row.then.length > 0 ? { label: t.then, value: row.then.join(", ") } : null,
  ].filter((fact) => fact !== null);
  return (
    <NowFrame label={t.label}>
      {/* Which project, which workflow, as tags first (retour d'Akili du
          01/11/2026: a task must read at first glance, among many); the
          place in the module only when the action does not say it. */}
      <div className="flex flex-wrap items-center gap-2 text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-[color:var(--text-secondary)]">
        <ProjectTag row={row} />
        <ModuleTag row={row} />
        {row.overdue && (
          <StatusBadge tone={overdueTone} size="sm">
            {fr.work.journeys.overdue}
          </StatusBadge>
        )}
        {badge}
        {context && <span>{context}</span>}
      </div>
      <h2 className="text-[length:var(--type-display-sm)] leading-[var(--type-display-sm-lh)] font-medium tracking-[var(--type-display-tracking)] text-balance">
        <MarkedText text={titleOf(row)} />
      </h2>
      {row.why && <p className={cn(secondary, "text-pretty")}>{row.why}</p>}
      {facts.length > 0 && (
        <dl className="flex flex-wrap gap-x-6 gap-y-1">
          {facts.map((fact) => (
            <div key={fact.label} className={cn("flex gap-1.5", secondary)}>
              <dt>{fact.label} :</dt>
              <dd className="font-semibold text-[color:var(--text-primary)]">
                {fact.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
      <div>
        <ViewLink href={row.href} className={buttonVariants()}>
          <ButtonRoll>{t.open}</ButtonRoll>
        </ViewLink>
      </div>
    </NowFrame>
  );
}
