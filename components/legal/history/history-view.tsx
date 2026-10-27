import Link from "next/link";

import { HistoryCsvButton } from "@/components/legal/history/history-csv-button";
import { EmptyNote } from "@/components/shell/empty-state";
import { DayGroups } from "@/components/ui/day-groups";
import { FilterChipLink } from "@/components/ui/filter-chip";
import { Timestamp } from "@/components/ui/timestamp";
import { ToneCallout } from "@/components/ui/tone-callout";
import { UrlFilters } from "@/components/ui/url-filters";
import { routes } from "@/lib/auth/redirects";
import { cn } from "@/lib/utils";
import { legalHistory } from "@/lib/i18n/fr/legal-history";
import {
  filterHistory,
  formatMonth,
  historyMonths,
  historyPeople,
  type HistoryFilter,
} from "@/lib/legal/history/filter";
import {
  HISTORY_BRANCHES,
  type LegalEvent,
  type LegalHistory,
} from "@/lib/legal/history/types";
import { viewHref } from "@/lib/ui/view-href";
import { formatInstantFull } from "@/lib/utils/instant";

const fr = { legalHistory };

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
  filter,
}: {
  projectId: string;
  history: LegalHistory;
  filter: HistoryFilter;
}) {
  const t = fr.legalHistory;
  const { branch } = filter;
  const base = routes.projectLegalStep(projectId, "history");
  const shown = filterHistory(history.events, filter);
  const byId = new Map(history.events.map((e) => [e.id, e]));
  // The other filters, kept by each chip of the dossier's parts.
  const kept = { par: filter.person, mois: filter.month };

  return (
    <div className="flex flex-col gap-6">
      <p className="text-body-md text-muted-foreground">{t.description}</p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label={t.filtersLabel} className="flex flex-wrap gap-1.5">
          <FilterChipLink href={viewHref(base, kept)} current={branch === null}>
            {t.branches.all}
          </FilterChipLink>
          {HISTORY_BRANCHES.map((key) => (
            <FilterChipLink
              key={key}
              href={viewHref(base, { ...kept, branche: key })}
              current={branch === key}
            >
              {t.branches[key]}
            </FilterChipLink>
          ))}
        </nav>
        <HistoryCsvButton
          events={shown}
          fileName={t.csv.fileName(
            branch ? t.branches[branch] : t.branches.all,
          )}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <UrlFilters
          path={base}
          params={{ branche: branch }}
          groups={[
            {
              key: "par",
              label: t.filters.person,
              allLabel: t.filters.everyone,
              options: historyPeople(history.events).map((p) => ({
                value: p,
                label: p,
              })),
              current: filter.person,
            },
            {
              key: "mois",
              label: t.filters.period,
              allLabel: t.filters.anyPeriod,
              options: historyMonths(history.events).map((m) => ({
                value: m,
                label: formatMonth(m),
              })),
              current: filter.month,
            },
          ]}
        />
        <span className="text-sm text-muted-foreground tabular-nums">
          {t.filters.count(shown.length, history.events.length)}
        </span>
      </div>
      {!history.complete && <ToneCallout tone="warning">{t.error}</ToneCallout>}
      {shown.length === 0 ? (
        <EmptyNote>{branch ? t.emptyBranch : t.empty}</EmptyNote>
      ) : (
        <DayGroups items={shown} idPrefix="legal-day" keyOf={(e) => e.id}>
          {(event) => (
            <EventLine
              event={event}
              cause={event.causeId ? byId.get(event.causeId) : undefined}
            />
          )}
        </DayGroups>
      )}
    </div>
  );
}

function EventLine({
  event,
  cause,
}: {
  event: LegalEvent;
  // The earlier event it follows (JUR-29), said with its instant.
  cause?: LegalEvent;
}) {
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
        {cause && (
          <span className="text-caption break-words text-muted-foreground">
            {t.causes.follows(cause.action, formatInstantFull(cause.at))}
          </span>
        )}
        {event.consequence && (
          <span className="text-caption break-words text-[color:var(--tone-warning-fg)]">
            {event.consequence}
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
