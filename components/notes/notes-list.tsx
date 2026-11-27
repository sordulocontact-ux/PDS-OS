"use client";

import { NotesTable } from "@/components/notes/notes-table";
import { useTextSearch } from "@/components/notes/use-text-search";
import { SearchableList } from "@/components/ui/searchable-list";
import type { CallDeleter } from "@/lib/calls/delete-rule";
import type { CallDoor } from "@/lib/calls/door";
import { notes } from "@/lib/i18n/fr/notes";
import type { NoteProjectOption } from "@/lib/notes/options";
import type { NoteRow } from "@/lib/notes/views";

const fr = { notes };

/**
 * The rows of a door's notes with a search: instant on the title (and the
 * project), and from 3 characters in the texts too (reports, transcripts,
 * notes), asked of the server: a row stays when its title matches or the
 * server found it in its text.
 */
export function NotesList({
  rows,
  now,
  door,
  deleter,
  projects,
  filters,
  empty,
}: {
  rows: NoteRow[];
  now: Date;
  door: CallDoor;
  deleter: CallDeleter;
  projects: NoteProjectOption[];
  // The page's filters, beside the search; what stands for no row at all.
  filters?: React.ReactNode;
  empty?: React.ReactNode;
}) {
  const t = fr.notes;
  const { found, onQueryChange } = useTextSearch();
  return (
    <SearchableList
      items={rows}
      searchText={(row) =>
        row.kind === "call"
          ? [row.call.title, row.call.projectTitle ?? t.internalCall]
          : [row.title, row.projectTitle ?? t.teamNote]
      }
      extraMatch={(row) =>
        found !== null &&
        (row.kind === "call"
          ? found.callIds.has(row.call.id)
          : found.noteIds.has(row.id))
      }
      onQueryChange={onQueryChange}
      label={t.search.label}
      placeholder={t.search.placeholder}
      noResult={() => t.empty.search}
      filters={filters}
      empty={empty}
    >
      {(visible) => (
        <NotesTable
          rows={visible}
          now={now}
          door={door}
          deleter={deleter}
          projects={projects}
        />
      )}
    </SearchableList>
  );
}
