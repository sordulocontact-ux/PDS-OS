"use client";

import { IconPlus } from "nucleo-sharp-essential";

import { NoteForm } from "@/components/notes/note-form";
import { DialogButton } from "@/components/ui/dialog-button";
import { notes } from "@/lib/i18n/fr/notes";
import type { NoteProjectOption } from "@/lib/notes/options";

const fr = { notes };

/**
 * « Nouvelle note » of a page (Notes, a project's notes): the form in the
 * modal. `projectId` fixes the project and hides its field (a project's
 * door); the projects are read by the page.
 */
export function NewNoteButton({
  projects,
  projectId,
  variant = "default",
}: {
  projects: NoteProjectOption[];
  projectId?: string;
  // « outline » beside another primary action (docs/DESIGN.md).
  variant?: "default" | "outline";
}) {
  return (
    <DialogButton
      label={fr.notes.newNote}
      icon={IconPlus}
      variant={variant}
      size="lg"
      title={fr.notes.form.createTitle}
      description=""
    >
      {(close) => (
        <NoteForm projects={projects} projectId={projectId} onDone={close} />
      )}
    </DialogButton>
  );
}
