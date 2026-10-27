"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import type { SelectableRow } from "@/components/ui/row-selection";
import { deleteRecords } from "@/lib/archive/delete-actions";
import type {
  ArchiveKind,
  DeleteErrorCode,
  DeleteResult,
} from "@/lib/archive/types";
import { records } from "@/lib/i18n/fr/records";
import { deleteProjectDrafts } from "@/lib/projects/draft-actions";

const fr = { records };

const IN_USE: DeleteErrorCode[] = [
  "artist_in_use",
  "master_in_use",
  "contact_in_use",
];

/**
 * Deletes one row or a selection and says what happened: how many went, and
 * for each row the database kept, its name and why. `onDone` gets the ids
 * that went (the list refreshes through revalidatePath). Drafts of the
 * projects list go by their own action, the rest by delete_records.
 */
export function useDeleteRecords(kind: ArchiveKind) {
  const t = fr.records.delete;
  const [pending, startTransition] = useTransition();

  function remove(rows: SelectableRow[], onDone: (deleted: string[]) => void) {
    startTransition(async () => {
      const result = await deleteRows(kind, rows);
      if (!result.ok) {
        toast.error(t.errors[result.error]);
        return;
      }
      const { deleted, failed } = result;
      const onlyDrafts = rows.every((row) => row.draft);
      if (deleted.length > 0)
        toast.success(
          onlyDrafts
            ? t.draftsDone(deleted.length)
            : t.done(kind, deleted.length),
        );
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

async function deleteRows(
  kind: ArchiveKind,
  rows: SelectableRow[],
): Promise<DeleteResult> {
  const draftIds = rows.filter((row) => row.draft).map((row) => row.id);
  const recordIds = rows.filter((row) => !row.draft).map((row) => row.id);
  const [drafts, records] = await Promise.all([
    draftIds.length > 0 ? deleteProjectDrafts(draftIds) : null,
    recordIds.length > 0 ? deleteRecords(kind, recordIds) : null,
  ]);
  if (records && !records.ok && !drafts?.ok) return records;
  if (drafts && !drafts.ok && !records?.ok)
    return { ok: false, error: "generic" };

  const deleted: string[] = [];
  const failed: { id: string; error: DeleteErrorCode }[] = [];
  if (drafts?.ok) {
    deleted.push(...drafts.deleted);
    // RLS: a draft that did not go is gone already or not the viewer's.
    for (const id of draftIds)
      if (!drafts.deleted.includes(id)) failed.push({ id, error: "not_found" });
  } else for (const id of draftIds) failed.push({ id, error: "generic" });
  if (records?.ok) {
    deleted.push(...records.deleted);
    failed.push(...records.failed);
  } else if (records)
    for (const id of recordIds) failed.push({ id, error: records.error });
  return { ok: true, deleted, failed };
}
