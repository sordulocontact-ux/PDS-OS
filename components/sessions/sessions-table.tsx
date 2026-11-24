import {
  sessionDuration,
  sessionHours,
  sessionName,
} from "@/components/sessions/session-format";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableLink,
  DataTableRow,
  DataTableText,
  EMPTY_CELL,
} from "@/components/ui/data-table";
import { masterPage } from "@/lib/i18n/fr/master-page";
import { cn } from "@/lib/utils";
import { sessions } from "@/lib/i18n/fr/sessions";
import { formatShortDate } from "@/lib/release/format";
import { sessionHref, type SessionDoor } from "@/lib/sessions/door";
import type { StudioSessionRow } from "@/lib/sessions/types";
import { sessionStateTone } from "@/lib/ui/state-tones";

const fr = { masterPage, sessions };

const secondary = "text-[color:var(--text-secondary)]";
const sub =
  "block text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-[color:var(--text-secondary)]";

/**
 * The sessions list (the menu's page, an artist's tab, a project's section):
 * when, what (with its engineer and length), for which artists (before the
 * projects, Ibé 06/11/2026), and its state, the report to write standing
 * out. The whole row opens the session. `hide` drops the column the page
 * already names (the artist, the project).
 */
export function SessionsTable({
  sessions: rows,
  door,
  hide,
}: {
  sessions: StudioSessionRow[];
  // Where a row opens (inside a project, back to an artist…).
  door: SessionDoor;
  hide?: "artists" | "projects";
}) {
  const t = fr.sessions.columns;
  return (
    <DataTable framed>
      <DataTableHeader>
        <DataTableHead>{t.date}</DataTableHead>
        <DataTableHead>{t.session}</DataTableHead>
        {hide !== "artists" && (
          <DataTableHead hideBelow="sm">{t.artists}</DataTableHead>
        )}
        {hide !== "projects" && (
          <DataTableHead hideBelow="lg">{t.projects}</DataTableHead>
        )}
        <DataTableHead fill>{t.state}</DataTableHead>
      </DataTableHeader>
      <DataTableBody>
        {rows.map((session) => {
          const hours = sessionHours(session);
          const detail = [session.engineer, sessionDuration(session)]
            .filter(Boolean)
            .join(" · ");
          return (
            <DataTableRow key={session.id}>
              <DataTableCell sort={session.date ?? ""}>
                <span className="block">
                  {/* The figures' typeface on figures only, never on
                      « Sans date ». */}
                  <span
                    className={cn(
                      "block whitespace-nowrap",
                      session.date && "tabular-nums",
                    )}
                  >
                    {session.date
                      ? formatShortDate(session.date)
                      : fr.sessions.noDate}
                  </span>
                  {hours && (
                    <span className={cn(sub, "tabular-nums")}>{hours}</span>
                  )}
                </span>
              </DataTableCell>
              <DataTableCell>
                <span className="block">
                  <DataTableLink href={sessionHref(door, session.id)}>
                    {sessionName(session)}
                  </DataTableLink>
                  {detail && <span className={sub}>{detail}</span>}
                </span>
              </DataTableCell>
              {hide !== "artists" && (
                <DataTableCell hideBelow="sm">
                  {session.artists.length > 0 ? (
                    <DataTableText>
                      {session.artists.map((a) => a.name).join(", ")}
                    </DataTableText>
                  ) : (
                    <span className={secondary}>{EMPTY_CELL}</span>
                  )}
                </DataTableCell>
              )}
              {hide !== "projects" && (
                <DataTableCell hideBelow="lg" className={secondary}>
                  {session.projects.length > 0 ? (
                    <DataTableText>
                      {session.projects.map((p) => p.name).join(", ")}
                    </DataTableText>
                  ) : (
                    EMPTY_CELL
                  )}
                </DataTableCell>
              )}
              <DataTableCell fill>
                <StatusBadge tone={sessionStateTone[session.state]}>
                  {fr.sessions.states[session.state]}
                </StatusBadge>
              </DataTableCell>
            </DataTableRow>
          );
        })}
      </DataTableBody>
    </DataTable>
  );
}
