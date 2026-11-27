"use client";

import { IconPenWriting4 } from "nucleo-sharp-essential";

import { FormMessage } from "@/components/auth/form-message";
import { NoteMenu } from "@/components/notes/note-menu";
import { NoteProjectPill } from "@/components/notes/note-project-pill";
import { SideSheet } from "@/components/ui/side-sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Timestamp } from "@/components/ui/timestamp";
import { useRecordSheetData } from "@/components/ui/use-record-sheet-data";
import { notes } from "@/lib/i18n/fr/notes";
import type { NoteProjectOption } from "@/lib/notes/options";
import { loadNoteSheet } from "@/lib/notes/sheet-actions";
import type { WrittenNoteRow } from "@/lib/notes/views";

const fr = { notes };

// What the sheet reads is keyed by the note's last change, so a note changed
// from its menu is read again (the list's own rows are refreshed by the
// action's revalidation).
const loadByVersion = (key: string) => loadNoteSheet(key.split("|")[0] ?? "");

/**
 * A written note opened from its row, in the side sheet (the Réseau's model,
 * docs/STYLE-FINANCE-PARTOUT.md § 6.7 bis): title, project, author and date
 * from the row at once, its whole text (paragraphs kept) read when it opens;
 * « ⋯ » (change, delete) for its author. ↑ ↓ follow the table's order.
 */
export function NoteSheet({
  note,
  projects,
  index,
  total,
  onClose,
  onMove,
}: {
  note: WrittenNoteRow;
  projects: NoteProjectOption[];
  // Its place among the rows the table shows.
  index: number;
  total: number;
  onClose: () => void;
  onMove: (to: number) => void;
}) {
  const t = fr.notes.sheet;
  const loaded = useRecordSheetData(
    `${note.id}|${note.updatedAt}`,
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
          <NoteMenu
            note={note}
            projects={projects}
            size="icon-sm"
            onDeleted={onClose}
          />
        ),
      }}
    >
      <div className="flex flex-col gap-1">
        <p className="text-display-sm font-medium break-words">{note.title}</p>
        <p className="text-[color:var(--text-secondary)]">
          {t.author} {note.author.name} ·{" "}
          <Timestamp iso={note.updatedAt} className="tabular-nums" />
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <NoteProjectPill projectId={note.projectId} title={note.projectTitle} />
      </div>
      {loaded === undefined ? (
        <div
          className="flex flex-col gap-3"
          role="status"
          aria-label={t.loading}
        >
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-5/6" />
          <Skeleton className="h-5 w-2/3" />
        </div>
      ) : loaded === "failed" || loaded === null ? (
        <FormMessage kind="error">{t.loadFailed}</FormMessage>
      ) : (
        data && (
          <p className="break-words whitespace-pre-wrap text-[color:var(--text-primary)]">
            {data.body}
          </p>
        )
      )}
    </SideSheet>
  );
}
