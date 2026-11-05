import { StatusBadge } from "@/components/ui/status-badge";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableLink,
  DataTableRow,
  EMPTY_CELL,
} from "@/components/ui/data-table";
import { routes } from "@/lib/auth/redirects";
import { masterPage } from "@/lib/i18n/fr/master-page";
import { sessions } from "@/lib/i18n/fr/sessions";
import { formatShortDate } from "@/lib/release/format";
import type {
  SessionReportState,
  StudioSessionRow,
} from "@/lib/sessions/types";
import type { Tone } from "@/lib/ui/state-tones";

const fr = { masterPage, sessions };

const secondary = "text-[color:var(--text-secondary)]";
const sub =
  "block text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-[color:var(--text-secondary)]";

const REPORT_TONE: Record<SessionReportState, Tone> = {
  todo: "action",
  done: "success",
  later: "neutral",
  cancelled: "neutral",
};

/** « Enregistrement · Studio Ferber », the name of a session in a list. */
export function sessionName(
  session: Pick<StudioSessionRow, "kind" | "studio">,
): string {
  return [fr.masterPage.sessions.kinds[session.kind], session.studio]
    .filter(Boolean)
    .join(" · ");
}

/** « 14:00 – 18:00 », or nothing. */
export function sessionHours(
  session: Pick<StudioSessionRow, "startsAt" | "endsAt">,
): string | null {
  return session.startsAt || session.endsAt
    ? fr.sessions.page.hours(session.startsAt, session.endsAt)
    : null;
}

/**
 * The sessions list (the menu's page, an artist's tab, a project's section):
 * when, what, for whom, and where the report stands. `hide` drops the column
 * the page already names (the artist, the project).
 */
export function SessionsTable({
  sessions: rows,
  hide,
}: {
  sessions: StudioSessionRow[];
  hide?: "artists" | "projects";
}) {
  const t = fr.sessions.columns;
  return (
    <DataTable>
      <DataTableHeader>
        <DataTableHead>{t.date}</DataTableHead>
        <DataTableHead>{t.session}</DataTableHead>
        {hide !== "artists" && (
          <DataTableHead hideBelow="sm">{t.artists}</DataTableHead>
        )}
        {hide !== "projects" && (
          <DataTableHead hideBelow="md">{t.projects}</DataTableHead>
        )}
        <DataTableHead fill>{t.report}</DataTableHead>
      </DataTableHeader>
      <DataTableBody>
        {rows.map((session) => {
          const hours = sessionHours(session);
          return (
            <DataTableRow key={session.id}>
              <DataTableCell className="tabular-nums">
                <span className="block">
                  <span className="block whitespace-nowrap">
                    {session.date
                      ? formatShortDate(session.date)
                      : fr.sessions.noDate}
                  </span>
                  {hours && <span className={sub}>{hours}</span>}
                </span>
              </DataTableCell>
              <DataTableCell>
                <span className="block">
                  <DataTableLink href={routes.session(session.id)}>
                    {sessionName(session)}
                  </DataTableLink>
                  {session.engineer && (
                    <span className={sub}>{session.engineer}</span>
                  )}
                </span>
              </DataTableCell>
              {hide !== "artists" && (
                <DataTableCell hideBelow="sm" className="break-words">
                  {session.artists.map((a) => a.name).join(", ") || (
                    <span className={secondary}>{EMPTY_CELL}</span>
                  )}
                </DataTableCell>
              )}
              {hide !== "projects" && (
                <DataTableCell hideBelow="md" className="break-words">
                  {session.projects.map((p) => p.name).join(", ") || (
                    <span className={secondary}>{EMPTY_CELL}</span>
                  )}
                </DataTableCell>
              )}
              <DataTableCell fill>
                <StatusBadge tone={REPORT_TONE[session.report]}>
                  {fr.sessions.reportState[session.report]}
                </StatusBadge>
              </DataTableCell>
            </DataTableRow>
          );
        })}
      </DataTableBody>
    </DataTable>
  );
}
