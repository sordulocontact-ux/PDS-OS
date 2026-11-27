"use client";

import { sessionHours } from "@/components/sessions/session-format";
import { SessionSheet } from "@/components/sessions/session-sheet";
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
import { TableSortProvider } from "@/components/ui/table-sort";
import { useSheetRow } from "@/components/ui/use-sheet-row";
import { formatShortDate } from "@/lib/release/format";
import { masterPage } from "@/lib/i18n/fr/master-page";
import { sessions } from "@/lib/i18n/fr/sessions";
import type { SessionDoor } from "@/lib/sessions/door";
import type { SessionRef, StudioSessionRow } from "@/lib/sessions/types";
import { sessionStateTone } from "@/lib/ui/state-tones";

const fr = { masterPage, sessions };

const secondary = "text-[color:var(--text-secondary)]";

/** A cell's text, or the empty mark in the secondary tone. */
function Text({ value }: { value: string | null | undefined }) {
  return value ? (
    <DataTableText>{value}</DataTableText>
  ) : (
    <span className={secondary}>{EMPTY_CELL}</span>
  );
}

const names = (list: string[]) => list.join(", ") || null;

/**
 * The sessions list (the menu's page, an artist's tab, a project's section,
 * a title's Vue d'ensemble), one fact a column (Sacha, 27/11/2026): the
 * séance, its day, its hours, its studio, its engineer, its artists, titles
 * and projects, who writes its report, its state. Its name opens the
 * session in the side sheet (↑ ↓ in the order shown, `?ouvrir=<id>`), its
 * page one click further. `hide` drops the column the page already names.
 * Columns leave from the least read as the screen narrows.
 */
export function SessionsTable({
  sessions: rows,
  door,
  hide,
}: {
  sessions: StudioSessionRow[];
  // Where « Ouvrir la session » leads (inside a project, back to an artist…).
  door: SessionDoor;
  hide?: "artists" | "projects";
}) {
  const t = fr.sessions.columns;
  // On a title's page, its titles go without saying.
  const titles = door.kind !== "title";
  const [sheet, setSheet] = useSheetRow(rows.map((row) => row.id));

  return (
    <TableSortProvider>
      <DataTable framed>
        <DataTableHeader>
          <DataTableHead icon="session">{t.session}</DataTableHead>
          <DataTableHead icon="date">{t.date}</DataTableHead>
          <DataTableHead icon="hours" hideBelow="lg">
            {t.hours}
          </DataTableHead>
          <DataTableHead icon="place" hideBelow="md">
            {t.studio}
          </DataTableHead>
          <DataTableHead icon="person" hideBelow="2xl">
            {t.engineer}
          </DataTableHead>
          {hide !== "artists" && (
            <DataTableHead icon="artist" hideBelow="lg">
              {t.artists}
            </DataTableHead>
          )}
          {titles && (
            <DataTableHead icon="master" hideBelow="xl">
              {t.titles}
            </DataTableHead>
          )}
          {hide !== "projects" && (
            <DataTableHead icon="project" hideBelow="2xl">
              {t.projects}
            </DataTableHead>
          )}
          <DataTableHead icon="people" hideBelow="2xl">
            {t.responsible}
          </DataTableHead>
          <DataTableHead icon="status" hideBelow="sm" fill>
            {t.state}
          </DataTableHead>
        </DataTableHeader>
        <DataTableBody>
          {rows.map((session, index) => (
            <SessionTableRow
              key={session.id}
              session={session}
              hide={hide}
              titles={titles}
              onOpen={() => setSheet(index)}
            />
          ))}
        </DataTableBody>
      </DataTable>
      <SessionSheet
        rows={rows}
        door={door}
        index={sheet}
        onClose={() => setSheet(null)}
        onMove={setSheet}
      />
    </TableSortProvider>
  );
}

function SessionTableRow({
  session,
  hide,
  titles,
  onOpen,
}: {
  session: StudioSessionRow;
  hide?: "artists" | "projects";
  titles: boolean;
  onOpen: () => void;
}) {
  const refs = (list: SessionRef[]) => names(list.map((r) => r.name));
  return (
    <DataTableRow>
      <DataTableCell>
        <DataTableLink href={null} onOpen={onOpen}>
          {fr.masterPage.sessions.kinds[session.kind]}
        </DataTableLink>
      </DataTableCell>
      <DataTableCell sort={session.date ?? ""}>
        {/* The figures' typeface on figures only, never on « Date à fixer ». */}
        {session.date ? (
          <span className="whitespace-nowrap tabular-nums">
            {formatShortDate(session.date)}
          </span>
        ) : (
          <span className={secondary}>{fr.sessions.noDate}</span>
        )}
      </DataTableCell>
      <DataTableCell hideBelow="lg" className="tabular-nums">
        <Text value={sessionHours(session)} />
      </DataTableCell>
      <DataTableCell hideBelow="md">
        <Text value={session.studio} />
      </DataTableCell>
      <DataTableCell hideBelow="2xl">
        <Text value={session.engineer} />
      </DataTableCell>
      {hide !== "artists" && (
        <DataTableCell hideBelow="lg">
          <Text value={refs(session.artists)} />
        </DataTableCell>
      )}
      {titles && (
        <DataTableCell hideBelow="xl">
          <Text value={names(session.titles.map((m) => m.title))} />
        </DataTableCell>
      )}
      {hide !== "projects" && (
        <DataTableCell hideBelow="2xl">
          <Text value={refs(session.projects)} />
        </DataTableCell>
      )}
      <DataTableCell hideBelow="2xl">
        <Text value={session.responsible?.name} />
      </DataTableCell>
      <DataTableCell hideBelow="sm" fill>
        <StatusBadge tone={sessionStateTone[session.state]}>
          {fr.sessions.states[session.state]}
        </StatusBadge>
      </DataTableCell>
    </DataTableRow>
  );
}
