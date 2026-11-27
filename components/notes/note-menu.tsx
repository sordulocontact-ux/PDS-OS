"use client";

import { IconPenWriting2, IconTrash } from "nucleo-sharp-essential";
import { useState, useTransition } from "react";

import { NoteForm } from "@/components/notes/note-form";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormDialog } from "@/components/ui/form-dialog";
import { Loaded } from "@/components/ui/loaded";
import { RowActions } from "@/components/ui/row-actions";
import { toast } from "@/components/ui/toast";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { notes } from "@/lib/i18n/fr/notes";
import { deleteNote } from "@/lib/notes/actions";
import type { NoteProjectOption } from "@/lib/notes/options";
import { loadNoteSheet } from "@/lib/notes/sheet-actions";

const fr = { dialogs, notes };

/**
 * « ⋯ » of a note written by the viewer, the same on its row and in its
 * sheet: « Modifier » (its form, read when it opens) and « Supprimer »
 * (asked first). The SQL has the last word: only its author changes or
 * deletes a note. `onDeleted`: the sheet closes once the note is gone.
 */
export function NoteMenu({
  note,
  projects,
  size = "icon-sm",
  reveal = false,
  onDeleted,
}: {
  note: { id: string; title: string };
  projects: NoteProjectOption[];
  size?: "icon-sm" | "icon-lg";
  reveal?: boolean;
  onDeleted?: () => void;
}) {
  const t = fr.notes;
  const [editing, setEditing] = useState(false);
  const [asking, setAsking] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <RowActions
        label={t.more(note.title)}
        size={size}
        reveal={reveal}
        actions={[
          {
            key: "edit",
            label: t.sheet.edit,
            icon: IconPenWriting2,
            onSelect: () => setEditing(true),
          },
          {
            key: "delete",
            label: t.sheet.delete,
            icon: IconTrash,
            onSelect: () => setAsking(true),
          },
        ]}
      />
      <FormDialog
        open={editing}
        onOpenChange={setEditing}
        title={t.form.editTitle}
        closeLabel={t.form.close}
      >
        <Loaded
          load={() => loadNoteSheet(note.id)}
          loadingLabel={t.form.loading}
          errorLabel={t.form.loadFailed}
        >
          {(data) =>
            data ? (
              <NoteForm
                projects={projects}
                note={{
                  id: data.id,
                  title: data.title,
                  body: data.body,
                  projectId: data.projectId,
                }}
                onDone={() => setEditing(false)}
              />
            ) : (
              <p role="status">{t.errors.notFound}</p>
            )
          }
        </Loaded>
      </FormDialog>
      <ConfirmDialog
        open={asking}
        onOpenChange={(next) => {
          setError(null);
          setAsking(next);
        }}
        title={t.remove.title}
        description={t.remove.body}
        cancelLabel={t.remove.cancel}
        closeLabel={fr.dialogs.close}
        confirmLabel={t.remove.confirm}
        pending={pending}
        destructive
        error={error}
        onConfirm={() =>
          startTransition(async () => {
            const result = await deleteNote(note.id);
            if (!result.ok) return setError(result.error);
            toast.success(t.remove.done);
            setAsking(false);
            onDeleted?.();
          })
        }
      />
    </>
  );
}
