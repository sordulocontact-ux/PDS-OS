"use client";

import { usePathname } from "next/navigation";

import { NoteForm } from "@/components/notes/note-form";
import { FormDialog } from "@/components/ui/form-dialog";
import { Loaded } from "@/components/ui/loaded";
import { notes } from "@/lib/i18n/fr/notes";
import { loadNoteProjectOptions } from "@/lib/notes/options";

const fr = { notes };

// /app/projects/<id>/…: the project the reader is on.
const PROJECT_PATH = /^\/app\/projects\/([0-9a-f-]{36})(?:\/|$)/i;

/** « Nouvelle note »: the Notes' form, on the project of the page when the
 * reader sees it (changeable); created, the note opens in its sheet. */
export default function QuickNote({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const t = fr.notes.form;
  const projectId = PROJECT_PATH.exec(usePathname())?.[1];
  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={t.createTitle}
      closeLabel={t.close}
    >
      <Loaded
        load={loadNoteProjectOptions}
        loadingLabel={t.loading}
        errorLabel={t.loadFailed}
      >
        {(projects) => (
          <NoteForm
            projects={projects}
            initial={{
              projectId: projects.some((p) => p.id === projectId)
                ? (projectId ?? null)
                : null,
            }}
            onDone={onClose}
          />
        )}
      </Loaded>
    </FormDialog>
  );
}
