"use client";

import { IconPenWriting2, IconTrash } from "nucleo-sharp-essential";
import { useState } from "react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { RowActions, type RowAction } from "@/components/ui/row-actions";
import { fr } from "@/lib/i18n/fr";
import type { PostResult } from "@/lib/production/post/result";

import { usePostSubmit } from "./use-post-submit";

const t = fr.productionPost;

/** The « ⋯ » of a reference, a step or a draft version: « Modifier » when
 * `onEdit` is given, « Supprimer » confirmed. */
export function PostRowMenu({
  label,
  onEdit,
  remove,
}: {
  label: string;
  onEdit?: () => void;
  remove: {
    title: string;
    body: string;
    done: string;
    action: () => Promise<PostResult>;
  };
}) {
  const [confirming, setConfirming] = useState(false);
  const close = () => setConfirming(false);
  const { pending, error, setError, run } = usePostSubmit(close, remove.done);
  const actions: RowAction[] = [
    ...(onEdit
      ? [
          {
            key: "edit",
            label: t.edit,
            icon: IconPenWriting2,
            onSelect: onEdit,
          },
        ]
      : []),
    {
      key: "delete",
      label: t.remove,
      icon: IconTrash,
      onSelect: () => setConfirming(true),
    },
  ];

  return (
    <>
      <RowActions label={label} actions={actions} />
      <ConfirmDialog
        open={confirming}
        onOpenChange={(open) => {
          if (open) return;
          setError(null);
          close();
        }}
        title={remove.title}
        description={remove.body}
        cancelLabel={t.cancel}
        closeLabel={t.close}
        confirmLabel={t.remove}
        pendingLabel={t.removing}
        pending={pending}
        destructive
        error={error}
        onConfirm={() => run(remove.action)}
      />
    </>
  );
}
