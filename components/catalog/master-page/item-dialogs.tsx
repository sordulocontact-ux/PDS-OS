"use client";

import { IconPenWriting2, IconPlus, IconTrash } from "nucleo-sharp-essential";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { RowActions } from "@/components/ui/row-actions";
import { deleteMasterItem } from "@/lib/catalog/master/item-actions";
import type { MasterItemSection } from "@/lib/catalog/master/rules";
import { fr } from "@/lib/i18n/fr";

// What every list of the master page shares: which row is being edited or
// deleted, the row's "⋯" (Modifier, Supprimer), and the confirmation.

/** `editing.item` null = adding. */
export function useItemDialogs<T>() {
  const [editing, setEditing] = useState<{ item: T | null } | null>(null);
  const [deleting, setDeleting] = useState<T | null>(null);
  return {
    editing,
    add: () => setEditing({ item: null }),
    edit: (item: T) => setEditing({ item }),
    closeForm: () => setEditing(null),
    deleting,
    remove: (item: T) => setDeleting(item),
    closeDelete: () => setDeleting(null),
  };
}

/** "+ Ajouter …" at the top right of a section. */
export function AddItemButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <Button variant="outline" size="sm" onClick={onClick}>
      <IconPlus aria-hidden data-icon="inline-start" />
      {label}
    </Button>
  );
}

export function ItemRowActions({
  name,
  onEdit,
  onDelete,
}: {
  name: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const t = fr.masterPage;
  return (
    <RowActions
      label={fr.records.menu.label(name)}
      actions={[
        {
          key: "edit",
          label: fr.records.menu.edit,
          icon: IconPenWriting2,
          onSelect: onEdit,
        },
        {
          key: "delete",
          label: t.remove.confirm,
          icon: IconTrash,
          onSelect: onDelete,
        },
      ]}
    />
  );
}

/** Confirms the deletion of a row; stays open with the error if it fails. */
export function DeleteItemDialog({
  masterId,
  section,
  item,
  title,
  body,
  onClose,
}: {
  masterId: string;
  section: MasterItemSection;
  // `alsoIds`: the other rows of the same person (a contributor's roles).
  item: { id: string; name: string; alsoIds?: string[] } | null;
  title: string;
  body: (name: string) => string;
  onClose: () => void;
}) {
  const t = fr.masterPage.remove;
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function close() {
    setError(null);
    onClose();
  }

  function confirm() {
    if (!item) return;
    startTransition(async () => {
      const result = await deleteMasterItem({
        masterId,
        section,
        itemId: item.id,
        alsoIds: item.alsoIds,
      });
      if (result.ok) close();
      else setError(result.error);
    });
  }

  return (
    <ConfirmDialog
      open={item !== null}
      onOpenChange={(open) => !open && close()}
      title={title}
      description={item ? body(item.name) : ""}
      cancelLabel={t.cancel}
      closeLabel={t.close}
      confirmLabel={t.confirm}
      pendingLabel={t.deleting}
      pending={pending}
      destructive
      error={error}
      onConfirm={confirm}
    />
  );
}
