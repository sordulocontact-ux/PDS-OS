"use client";

import { IconPenWriting2, IconTrash } from "nucleo-sharp-essential";
import { useState, useTransition, type ReactNode } from "react";
import { toast } from "@/components/ui/toast";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormDialog } from "@/components/ui/form-dialog";
import { RowActions, type RowAction } from "@/components/ui/row-actions";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import type { WriteResult } from "@/lib/utils/write-result";

const fr = { dialogs };

const t = fr.dialogs;

/**
 * The « ⋯ » of a preproduction row: « Modifier » in the modal, « Supprimer »
 * confirmed, plus the row's own actions. Nothing when the viewer cannot
 * write (no form, no delete, no extra).
 */
export function RecordMenu({
  label,
  edit,
  remove,
  extra = [],
}: {
  // Names the row in the menu's accessible label.
  label: string;
  edit?: {
    title: string;
    description: string;
    wide?: boolean;
    form: (close: () => void) => ReactNode;
  };
  remove?: {
    title: string;
    body: string;
    done: string;
    run: () => Promise<WriteResult>;
    // Another verb than « Supprimer » (« Déconnecter »), in the menu and on
    // the confirm button, with its pending label.
    label?: string;
    pendingLabel?: string;
  };
  extra?: RowAction[];
}) {
  const [dialog, setDialog] = useState<"edit" | "delete" | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const close = () => {
    setError(null);
    setDialog(null);
  };
  const actions: RowAction[] = [
    ...extra,
    ...(edit
      ? [
          {
            key: "edit",
            label: t.edit,
            icon: IconPenWriting2,
            onSelect: () => setDialog("edit"),
          },
        ]
      : []),
    ...(remove
      ? [
          {
            key: "delete",
            label: remove.label ?? t.remove,
            icon: IconTrash,
            onSelect: () => setDialog("delete"),
          },
        ]
      : []),
  ];

  return (
    <>
      <RowActions label={t.menu(label)} actions={actions} />
      {edit && (
        <FormDialog
          open={dialog === "edit"}
          onOpenChange={(open) => !open && close()}
          title={edit.title}
          description={edit.description}
          closeLabel={t.close}
          size={edit.wide ? "wide" : "default"}
        >
          {edit.form(close)}
        </FormDialog>
      )}
      {remove && (
        <ConfirmDialog
          open={dialog === "delete"}
          onOpenChange={(open) => !open && close()}
          title={remove.title}
          description={remove.body}
          cancelLabel={t.cancel}
          closeLabel={t.close}
          confirmLabel={remove.label ?? t.remove}
          pendingLabel={remove.pendingLabel ?? fr.dialogs.deleting}
          pending={pending}
          destructive
          error={error}
          onConfirm={() =>
            startTransition(async () => {
              const result = await remove.run();
              if (!result.ok) return setError(result.error);
              toast.success(remove.done);
              close();
            })
          }
        />
      )}
    </>
  );
}
