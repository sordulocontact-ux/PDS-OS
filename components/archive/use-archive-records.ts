"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import type { SelectableRow } from "@/components/ui/row-selection";
import { setManyArchived } from "@/lib/archive/actions";
import type { ArchiveKind } from "@/lib/archive/types";
import { fr } from "@/lib/i18n/fr";

/**
 * Archives (or restores, `archived` = the list shows the archive) a
 * selection and says what happened: how many went, and for each row the
 * database kept, its name and why. `onDone` gets the ids that went (the list
 * refreshes through revalidatePath).
 */
export function useArchiveRecords(kind: ArchiveKind, archived: boolean) {
  const t = fr.records;
  const words = archived ? t.restore : t.archive;
  const [pending, startTransition] = useTransition();

  function run(rows: SelectableRow[], onDone: (done: string[]) => void) {
    startTransition(async () => {
      const result = await setManyArchived(
        kind,
        rows.map((row) => row.id),
        !archived,
      );
      if (!result.ok) {
        toast.error(t.errors[result.error]);
        return;
      }
      const { done, failed } = result;
      if (done.length > 0) toast.success(words.doneMany(kind, done.length));
      if (failed.length > 0) {
        const lines = failed.map(({ id, error }) => {
          const name = rows.find((row) => row.id === id)?.name ?? "";
          return t.delete.reason(name, t.errors[error]);
        });
        // One row: its reason is the message.
        if (rows.length === 1) toast.error(t.errors[failed[0].error]);
        else
          toast.error(words.partial(kind, failed.length), {
            description: [...new Set(lines)].join("\n"),
            classNames: { description: "whitespace-pre-line" },
            duration: 10_000,
          });
      }
      onDone(done);
    });
  }

  return { pending, run };
}
