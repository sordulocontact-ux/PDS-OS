"use client";

import {
  IconArrowDottedRotateAnticlockwise,
  IconBoxArchive,
  IconTrash,
} from "nucleo-sharp-essential";
import { useState } from "react";

import { useArchiveRecords } from "@/components/archive/use-archive-records";
import { useDeleteRecords } from "@/components/archive/use-delete-records";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { RowSelection, useRowSelection } from "@/components/ui/row-selection";
import { SelectionBar as FloatingSelectionBar } from "@/components/ui/selection-bar";
import type { ArchiveKind } from "@/lib/archive/types";
import { records } from "@/lib/i18n/fr/records";

const fr = { records };

/**
 * Selection of a main list (artists, titles, projects, network): checkboxes
 * in the table (SelectAllHead, SelectRowCell), and a bar floating at the
 * bottom of the screen once a row is ticked, to archive (or restore, in the
 * archive) or delete them together. `actions`: the list's own gestures on
 * the selection, first in the bar (« Ajouter à une liste » of the Réseau);
 * `manage` false: no archiving nor deleting (who does not hold the right
 * still selects for `actions`).
 */
export function RecordSelection({
  kind,
  archived = false,
  actions,
  manage = true,
  children,
}: {
  kind: ArchiveKind;
  // The list shows the archive: the selection is restored, not archived.
  archived?: boolean;
  actions?: React.ReactNode;
  manage?: boolean;
  children: React.ReactNode;
}) {
  return (
    <RowSelection>
      {children}
      <SelectionBar
        kind={kind}
        archived={archived}
        actions={actions}
        manage={manage}
      />
    </RowSelection>
  );
}

type Confirming = "none" | "archive" | "delete";

function SelectionBar({
  kind,
  archived,
  actions,
  manage,
}: {
  kind: ArchiveKind;
  archived: boolean;
  actions?: React.ReactNode;
  manage: boolean;
}) {
  const t = fr.records;
  const { selected, toggle } = useRowSelection();
  const [open, setOpen] = useState<Confirming>("none");
  const confirming = open !== "none";
  const { pending, remove } = useDeleteRecords(kind);
  const archiving = useArchiveRecords(kind, archived);
  const count = selected.length;
  // Drafts of the projects list are deleted, never archived.
  const archivable = selected.filter((row) => !row.draft);
  const words = archived ? t.restore : t.archive;

  function confirm() {
    remove(selected, (deleted) => {
      // Rows kept by the database stay ticked, to be seen.
      for (const id of deleted) toggle(id, false);
      setOpen("none");
    });
  }

  function confirmArchive() {
    archiving.run(archivable, (done) => {
      // Rows kept by the database stay ticked, to be seen.
      for (const id of done) toggle(id, false);
      setOpen("none");
    });
  }

  const singleArchivable = archivable.length === 1 ? archivable[0] : null;

  const single = count === 1 ? selected[0] : null;
  // Drafts of the projects list alone: nothing but the typing is lost.
  const onlyDrafts = count > 0 && selected.every((row) => row.draft);

  return (
    <>
      <FloatingSelectionBar paused={confirming}>
        {actions}
        {manage && archivable.length > 0 && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setOpen("archive")}
          >
            {archived ? (
              <IconArrowDottedRotateAnticlockwise
                aria-hidden
                data-icon="inline-start"
              />
            ) : (
              <IconBoxArchive aria-hidden data-icon="inline-start" />
            )}
            {archived ? t.selection.restore : t.selection.archive}
          </Button>
        )}
        {manage && (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => setOpen("delete")}
          >
            <IconTrash aria-hidden data-icon="inline-start" />
            {t.selection.delete}
          </Button>
        )}
      </FloatingSelectionBar>

      <ConfirmDialog
        open={open === "archive" && archivable.length > 0}
        onOpenChange={(next) => !next && !archiving.pending && setOpen("none")}
        title={
          singleArchivable
            ? words.title(singleArchivable.name)
            : words.titleMany(kind, archivable.length)
        }
        description={singleArchivable ? words.body[kind] : words.bodyMany[kind]}
        cancelLabel={t.cancel}
        closeLabel={t.edit.close}
        confirmLabel={words.confirm}
        pendingLabel={words.pending}
        pending={archiving.pending}
        onConfirm={confirmArchive}
      />

      <ConfirmDialog
        open={open === "delete" && count > 0}
        onOpenChange={(next) => !next && !pending && setOpen("none")}
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
