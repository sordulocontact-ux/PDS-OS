"use client";

import { IconPenWriting4 } from "nucleo-sharp-essential";
import { useRef, useState } from "react";

import { NoteEditor, NoteSaveStatus } from "@/components/notes/note-editor";
import type {
  NoteDraft,
  NoteSaveState,
} from "@/components/notes/use-note-autosave";
import { SideSheet } from "@/components/ui/side-sheet";
import { notes } from "@/lib/i18n/fr/notes";
import type { NoteLinkChoices } from "@/lib/notes/options";

const fr = { notes };

const NOWHERE = () => {};

/**
 * « Nouvelle note » (a page's button, the shell's « + », ⌘K): the note's
 * side sheet, opened as a blank document (after Accordee): the title takes
 * the focus, nothing to submit, saved as one types; closed empty, nothing is
 * created. `initial`: what it starts from (the project one is on, a draft
 * of PO), all of it changeable. `choices`: null while they load.
 */
export function NewNoteSheet({
  choices,
  initial,
  onClose,
}: {
  choices: NoteLinkChoices | null;
  initial?: Partial<NoteDraft>;
  onClose: () => void;
}) {
  const [state, setState] = useState<NoteSaveState>("idle");
  const title = useRef<HTMLInputElement>(null);
  const [start] = useState<NoteDraft>(() => ({
    title: "",
    body: "",
    link: null,
    ...initial,
  }));
  return (
    <SideSheet
      open
      onClose={onClose}
      title={fr.notes.newNote}
      index={0}
      total={1}
      onMove={NOWHERE}
      initialFocus={title}
      bar={{
        icon: IconPenWriting4,
        actions: <NoteSaveStatus state={state} />,
      }}
    >
      <NoteEditor
        noteId={null}
        start={start}
        author={choices?.me ?? { personId: "", name: "" }}
        editedAt={null}
        choices={choices}
        titleRef={title}
        onState={setState}
      />
    </SideSheet>
  );
}
