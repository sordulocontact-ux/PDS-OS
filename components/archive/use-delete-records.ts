"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import type { SelectableRow } from "@/components/ui/row-selection";
import { deleteRecords } from "@/lib/archive/delete-actions";
import type { ArchiveKind, DeleteErrorCode } from "@/lib/archive/types";
import { fr } from "@/lib/i18n/fr";

const IN_USE: DeleteErrorCode[] = [
  "artist_in_use",
  "master_in_use",
  "contact_in_use",
];

/**
 * Deletes one row or a selection and says what happened: how many went, and
 * for each row the database kept, its name and why. `onDone` gets the ids
 * that went (the list refreshes through revalidatePath).
 */
export function useDeleteRecords(kind: ArchiveKind) {
  const t = fr.records.delete;
  const [pending, startTransition] = useTransition();

  function remove(rows: SelectableRow[], onDone: (deleted: string[]) => void) {
    startTransition(async () => {
      const result = await deleteRecords(
        kind,
        rows.map((row) => row.id),
      );
      if (!result.ok) {
        toast.error(t.errors[result.error]);
        return;
      }
      const { deleted, failed } = result;
      if (deleted.length > 0) toast.success(t.done(kind, deleted.length));
      if (failed.length > 0) {
        const lines = failed.map(({ id, error }) => {
          const name = rows.find((row) => row.id === id)?.name ?? "";
          return IN_USE.includes(error)
            ? t.reason(name, t.errors[error])
            : t.errors[error];
        });
        // One row: its reason is the message.
        if (rows.length === 1) toast.error(lines[0]);
        else
          toast.error(t.partial(kind, failed.length), {
            description: [...new Set(lines)].join("\n"),
            classNames: { description: "whitespace-pre-line" },
            duration: 10_000,
          });
      }
      onDone(deleted);
    });
  }

  return { pending, remove };
}
