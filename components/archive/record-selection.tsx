"use client";

import { IconTrash, IconXmark } from "nucleo-sharp-essential";
import { useEffect, useState } from "react";

import { useDeleteRecords } from "@/components/archive/use-delete-records";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { RowSelection, useRowSelection } from "@/components/ui/row-selection";
import type { ArchiveKind } from "@/lib/archive/types";
import { fr } from "@/lib/i18n/fr";

/**
 * Selection of a main list (artists, titles, projects, network): checkboxes
 * in the table (SelectAllHead, SelectRowCell), and a bar floating at the
 * bottom of the screen once a row is ticked, to delete them together.
 */
export function RecordSelection({
  kind,
  children,
}: {
  kind: ArchiveKind;
  children: React.ReactNode;
}) {
  return (
    <RowSelection>
      {children}
      <SelectionBar kind={kind} />
    </RowSelection>
  );
}

function SelectionBar({ kind }: { kind: ArchiveKind }) {
  const t = fr.records;
  const { selected, clear, toggle } = useRowSelection();
  const [confirming, setConfirming] = useState(false);
  const { pending, remove } = useDeleteRecords(kind);
  const count = selected.length;

  // Escape lets go of the selection (the dialog handles its own Escape).
  useEffect(() => {
    if (count === 0 || confirming) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") clear();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [count, confirming, clear]);

  function confirm() {
    remove(selected, (deleted) => {
      // Rows kept by the database stay ticked, to be seen.
      for (const id of deleted) toggle(id, false);
      setConfirming(false);
    });
  }

  const single = count === 1 ? selected[0] : null;
  // Drafts of the projects list alone: nothing but the typing is lost.
  const onlyDrafts = count > 0 && selected.every((row) => row.draft);

  return (
    <>
      {count > 0 && (
        <div
          role="toolbar"
          aria-label={t.selection.bar}
          className="surface-glass fixed inset-x-0 bottom-[max(1.5rem,env(safe-area-inset-bottom))] z-40 mx-auto flex w-fit items-center gap-1 rounded-full bg-[var(--surface-glass)] py-1.5 pr-1.5 pl-5 text-[color:var(--text-primary)] shadow-[var(--elevation-3)] backdrop-blur-[var(--glass-panel-blur)] transition-[opacity,translate] duration-200 ease-out motion-reduce:transition-none starting:translate-y-2 starting:opacity-0"
        >
          <span
            aria-live="polite"
            className="mr-3 text-[length:var(--type-body-md)] font-medium tabular-nums"
          >
            {t.selection.count(count)}
          </span>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => setConfirming(true)}
          >
            <IconTrash aria-hidden data-icon="inline-start" />
            {t.selection.delete}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t.selection.clear}
            onClick={clear}
          >
            <IconXmark aria-hidden />
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirming && count > 0}
        onOpenChange={(next) => !next && !pending && setConfirming(false)}
        title={
          single
            ? t.delete.title(single.name)
            : onlyDrafts
              ? t.delete.drafts.titleMany(count)
              : t.delete.titleMany(kind, count)
        }
        description={
          onlyDrafts
            ? single
              ? t.delete.drafts.body
              : t.delete.drafts.bodyMany
            : single
              ? t.delete.body[kind]
              : t.delete.bodyMany[kind]
        }
        cancelLabel={t.cancel}
        closeLabel={t.edit.close}
        confirmLabel={t.delete.confirm}
        pendingLabel={t.delete.pending}
        pending={pending}
        destructive
        onConfirm={confirm}
      />
    </>
  );
}
