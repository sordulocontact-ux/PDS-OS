"use client";

import { SessionsTable } from "@/components/sessions/sessions-table";
import { SearchableList } from "@/components/ui/searchable-list";
import { masterPage } from "@/lib/i18n/fr/master-page";
import { sessions } from "@/lib/i18n/fr/sessions";
import type { SessionDoor } from "@/lib/sessions/door";
import type { StudioSessionRow } from "@/lib/sessions/types";

const fr = { masterPage, sessions };

// Sessions with an instant search on studio, engineer, artists, projects.
export function SessionsList({
  sessions: rows,
  door,
  hide,
  empty,
}: {
  sessions: StudioSessionRow[];
  door: SessionDoor;
  hide?: "artists" | "projects";
  empty?: React.ReactNode;
}) {
  const t = fr.sessions.search;
  return (
    <SearchableList
      items={rows}
      searchText={(s) => [
        fr.masterPage.sessions.kinds[s.kind],
        s.studio,
        s.engineer,
        ...s.artists.map((a) => a.name),
        ...s.projects.map((p) => p.name),
        ...s.titles.map((m) => m.title),
      ]}
      label={t.label}
      placeholder={t.placeholder}
      noResult={t.noResult}
      empty={empty}
    >
      {(visible) => (
        <SessionsTable sessions={visible} door={door} hide={hide} />
      )}
    </SearchableList>
  );
}
