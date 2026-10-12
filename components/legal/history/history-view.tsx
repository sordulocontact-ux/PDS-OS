import Link from "next/link";

import { EmptyNote } from "@/components/shell/empty-state";
import { DayGroups } from "@/components/ui/day-groups";
import { FilterChipLink } from "@/components/ui/filter-chip";
import { Timestamp } from "@/components/ui/timestamp";
import { ToneCallout } from "@/components/ui/tone-callout";
import { routes } from "@/lib/auth/redirects";
import { cn } from "@/lib/utils";
import { fr } from "@/lib/i18n/fr";
import {
  HISTORY_BRANCHES,
  type HistoryBranch,
  type LegalEvent,
  type LegalHistory,
} from "@/lib/legal/history/types";

/**
 * The Historique du Juridique (JUR-29): every recorded event of the dossier,
 * newest first and grouped by day, each with its hour (Paris), who did it,
 * what it is about, its note and a proof typed by hand said « non
 * vérifiée ». Filtered by part of the dossier in the URL; a finished
 * démarche stays here even once it left the plan's active lists.
 */
export function HistoryView({
  projectId,
  history,
  branch,
}: {
  projectId: string;
  history: LegalHistory;
  branch: HistoryBranch | null;
}) {
  const t = fr.legalHistory;
  const base = routes.projectLegalStep(projectId, "history");
  const shown = branch
    ? history.events.filter((e) => e.branch === branch)
    : history.events;

  return (
    <div className="flex flex-col gap-6">
      <p className="text-body-md text-muted-foreground">{t.description}</p>
      <nav aria-label={t.filtersLabel} className="flex flex-wrap gap-1.5">
        <FilterChipLink href={base} current={branch === null}>
          {t.branches.all}
        </FilterChipLink>
        {HISTORY_BRANCHES.map((key) => (
          <FilterChipLink
            key={key}
            href={`${base}?branche=${key}`}
            current={branch === key}
          >
            {t.branches[key]}
          </FilterChipLink>
        ))}
      </nav>
      {!history.complete && <ToneCallout tone="warning">{t.error}</ToneCallout>}
      {shown.length === 0 ? (
        <EmptyNote>{branch ? t.emptyBranch : t.empty}</EmptyNote>
      ) : (
        <DayGroups items={shown} idPrefix="legal-day" keyOf={(e) => e.id}>
          {(event) => <EventLine event={event} />}
        </DayGroups>
      )}
    </div>
  );
}

function EventLine({ event }: { event: LegalEvent }) {
  const t = fr.legalHistory;
  const meta = [event.subject, event.by].filter(Boolean).join(" · ");
  const body = (
    <>
      <Timestamp
        iso={event.at}
        hourOnly
        className="w-12 shrink-0 text-sm text-muted-foreground tabular-nums"
      />
      <span className="grid min-w-0 gap-0.5 text-body-md">
        <span className="font-semibold">{event.action}</span>
        {meta && (
          <span className="break-words text-muted-foreground">{meta}</span>
        )}
        {event.note && (
          <span className="break-words text-muted-foreground">
            « {event.note} »
          </span>
        )}
        {event.manualProof && (
          <span className="text-caption break-words text-muted-foreground">
            {t.manual(event.manualProof)}
          </span>
        )}
      </span>
    </>
  );
  const row = "-mx-2 flex items-baseline gap-4 rounded-lg px-2 py-1.5";
  return event.href ? (
    <Link
      href={event.href}
      className={cn(row, "hover:bg-[var(--control-bg-hover)]")}
    >
      {body}
    </Link>
  ) : (
    <div className={row}>{body}</div>
  );
}
