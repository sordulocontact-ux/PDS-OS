"use client";

import { IconPenWriting2, IconTrash } from "nucleo-sharp-essential";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { RowActions } from "@/components/ui/row-actions";
import { routes } from "@/lib/auth/redirects";
import { shell } from "@/lib/i18n/fr/shell";
import { deleteProjectDraft } from "@/lib/projects/draft-actions";

const fr = { shell };

/**
 * « ⋯ » of a draft in the projects list (PROJ-TEST-01): resume the new
 * project form where it was left, or throw the draft away (confirmed: what
 * was typed is lost, no project exists yet).
 */
export function DraftRowActions({
  draftId,
  name,
}: {
  draftId: string;
  name: string;
}) {
  const t = fr.shell.newProject.draft;
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const remove = () => {
    setError(null);
    startTransition(async () => {
      const result = await deleteProjectDraft(draftId);
      if (!result.ok) {
        setError(t.deleteFailed);
        return;
      }
      setConfirming(false);
    });
  };

  return (
    <>
      <RowActions
        label={t.actions(name)}
        actions={[
          {
            key: "resume",
            label: t.resume,
            icon: IconPenWriting2,
            onSelect: () =>
              router.push(`${routes.projectsNew}?draft=${draftId}`),
          },
          {
            key: "delete",
            label: t.delete,
            icon: IconTrash,
            onSelect: () => setConfirming(true),
          },
        ]}
      />
      <ConfirmDialog
        open={confirming}
        onOpenChange={(open) => {
          setConfirming(open);
          if (!open) setError(null);
        }}
        title={t.confirmTitle}
        description={t.confirmDescription}
        cancelLabel={t.cancel}
        closeLabel={t.close}
        confirmLabel={t.confirm}
        pendingLabel={t.deleting}
        pending={pending}
        destructive
        error={error}
        onConfirm={remove}
      />
    </>
  );
}
