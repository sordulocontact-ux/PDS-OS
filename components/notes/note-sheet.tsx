"use client";

import { IconPenWriting4 } from "nucleo-sharp-essential";
import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { NoteDocument } from "@/components/notes/note-document";
import { NoteEditor, NoteSaveStatus } from "@/components/notes/note-editor";
import { NoteMenu } from "@/components/notes/note-menu";
import type { NoteSaveState } from "@/components/notes/use-note-autosave";
import { SideSheet } from "@/components/ui/side-sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useRecordSheetData } from "@/components/ui/use-record-sheet-data";
import { notes } from "@/lib/i18n/fr/notes";
import type { NoteLinkChoices } from "@/lib/notes/options";
import { loadNoteSheet } from "@/lib/notes/sheet-actions";
import type { WrittenNoteRow } from "@/lib/notes/views";

const fr = { notes };

// What the sheet reads is keyed by the note's last change, so a note changed
// elsewhere is read again; the list's own rows are refreshed by the actions'
// revalidation.
const loadByVersion = (key: string) => loadNoteSheet(key.split("|")[0] ?? "");
const versionOf = (note: WrittenNoteRow) => `${note.id}|${note.updatedAt}`;

/**
 * A written note opened from its row, in the side sheet (the Réseau's model,
 * docs/STYLE-FINANCE-PARTOUT.md § 6.7 bis) as a document (NoteDocument): its
 * whole text read when it opens. Its author changes it in place, saved as
 * he types (NoteEditor, the saving's state in the bar) and deletes it from
 * « ⋯ »; the others read it. ↑ ↓ follow the table's order.
 */
export function NoteSheet({
  note,
  choices,
  index,
  total,
  onClose,
  onMove,
}: {
  note: WrittenNoteRow;
  choices: NoteLinkChoices;
  // Its place among the rows the table shows.
  index: number;
  total: number;
  onClose: () => void;
  onMove: (to: number) => void;
}) {
  const t = fr.notes.sheet;
  const [state, setState] = useState<NoteSaveState>("idle");
  // The author's own saves change the row's last change: the version read
  // is the one the note had when it was opened, so his document stays.
  const [opened, setOpened] = useState(() => versionOf(note));
  if (!opened.startsWith(`${note.id}|`)) setOpened(versionOf(note));
  const loaded = useRecordSheetData(
    note.mine ? opened : versionOf(note),
    loadByVersion,
  );
  const data = loaded && loaded !== "failed" ? loaded : null;

  return (
    <SideSheet
      open
      onClose={onClose}
      title={note.title}
      index={index}
      total={total}
      onMove={onMove}
      bar={{
        icon: IconPenWriting4,
        actions: note.mine && (
          <>
            <NoteSaveStatus state={state} />
            <NoteMenu note={note} size="icon-sm" onDeleted={onClose} />
          </>
        ),
      }}
    >
      {loaded === undefined ? (
        <div
          className="flex flex-col gap-3"
          role="status"
          aria-label={t.loading}
        >
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-5/6" />
        </div>
      ) : !data ? (
        <FormMessage kind="error">{t.loadFailed}</FormMessage>
      ) : note.mine ? (
        <NoteEditor
          key={note.id}
          noteId={note.id}
          start={{ title: data.title, body: data.body, link: data.link }}
          author={data.author}
          editedAt={data.updatedAt}
          choices={choices}
          onState={setState}
        />
      ) : (
        <NoteDocument
          draft={{ title: data.title, body: data.body, link: data.link }}
          author={data.author}
          editedAt={data.updatedAt}
        />
      )}
    </SideSheet>
  );
}
