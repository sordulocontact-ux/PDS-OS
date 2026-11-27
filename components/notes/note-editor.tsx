"use client";

import { useEffect, type RefObject } from "react";

import { NoteDocument } from "@/components/notes/note-document";
import {
  useNoteAutosave,
  type NoteDraft,
  type NoteSaveState,
} from "@/components/notes/use-note-autosave";
import { notes } from "@/lib/i18n/fr/notes";
import type { NoteLinkChoices } from "@/lib/notes/options";
import type { NotePerson } from "@/lib/notes/views";
import { cn } from "@/lib/utils";

const fr = { notes };

/**
 * A note its author writes in place, saved as he types (useNoteAutosave):
 * a new one (`noteId` null) or his own, opened in its sheet. What is typed
 * is also saved when it closes (the editor unmounts). `onState`: the sheet's
 * bar says where the saving is (NoteSaveStatus).
 */
export function NoteEditor({
  noteId,
  start,
  author,
  editedAt,
  choices,
  titleRef,
  onState,
}: {
  noteId: string | null;
  start: NoteDraft;
  author: NotePerson;
  editedAt: string | null;
  choices: NoteLinkChoices | null;
  titleRef?: RefObject<HTMLInputElement | null>;
  onState: (state: NoteSaveState) => void;
}) {
  const { draft, change, state, savedAt } = useNoteAutosave(noteId, start);
  useEffect(() => onState(state), [onState, state]);
  // A link pre-filled by its id alone (the project one is on) takes its
  // name once the choices are read.
  const link =
    draft.link && !draft.link.label
      ? {
          ...draft.link,
          label:
            choices?.[draft.link.kind].find((o) => o.id === draft.link?.id)
              ?.label ?? "",
        }
      : draft.link;
  return (
    <NoteDocument
      draft={{ ...draft, link }}
      author={author}
      editedAt={savedAt ?? editedAt}
      choices={choices}
      onChange={change}
      titleRef={titleRef}
    />
  );
}

/** Where a note's saving is, small in its sheet's bar: nothing before the
 * first key, « Enregistrement… », « Enregistré », « Non enregistré ». */
export function NoteSaveStatus({ state }: { state: NoteSaveState }) {
  const t = fr.notes.document;
  const text =
    state === "pending" || state === "saving"
      ? t.saving
      : state === "saved"
        ? t.saved
        : state === "failed"
          ? t.failed
          : null;
  return (
    <span
      aria-live="polite"
      className={cn(
        "shrink-0 text-caption",
        state === "failed"
          ? "text-[color:var(--tone-danger-fg)]"
          : "text-[color:var(--text-tertiary)]",
      )}
    >
      {text}
    </span>
  );
}
