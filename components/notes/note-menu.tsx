"use client";

import { IconTrash } from "nucleo-sharp-essential";
import { useState, useTransition } from "react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { RowActions } from "@/components/ui/row-actions";
import { toast } from "@/components/ui/toast";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { notes } from "@/lib/i18n/fr/notes";
import { deleteNote } from "@/lib/notes/actions";

const fr = { dialogs, notes };

/**
 * « ⋯ » of a note written by the viewer, the same on its row and in its
 * sheet: « Supprimer » (asked first); it is changed in place, in its sheet.
 * The SQL has the last word: only its author deletes a note. `onDeleted`:
 * the sheet closes once the note is gone.
 */
export function NoteMenu({
  note,
  size = "icon-sm",
  reveal = false,
  onDeleted,
}: {
  note: { id: string; title: string };
  size?: "icon-sm" | "icon-lg";
  reveal?: boolean;
  onDeleted?: () => void;
}) {
  const t = fr.notes;
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
            key: "delete",
            label: t.sheet.delete,
            icon: IconTrash,
            onSelect: () => setAsking(true),
          },
        ]}
      />
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
