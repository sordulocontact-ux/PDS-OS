"use client";

import { IconTrash } from "nucleo-sharp-essential";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { SessionFormButton } from "@/components/sessions/session-form-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { RowActions } from "@/components/ui/row-actions";
import { toast } from "@/components/ui/toast";
import { masterPage } from "@/lib/i18n/fr/master-page";
import { sessions } from "@/lib/i18n/fr/sessions";
import { deleteStudioSession } from "@/lib/sessions/actions";
import type { StudioSession } from "@/lib/sessions/types";

const fr = { masterPage, sessions };

/** « Modifier » and « ⋯ » › « Supprimer la session », in the page's head. */
export function SessionHeaderActions({
  session,
  afterDeleteHref,
}: {
  session: StudioSession;
  // The list of the door it was opened from.
  afterDeleteHref: string;
}) {
  const t = fr.sessions;
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-wrap gap-2">
      <SessionFormButton session={session} />
      <RowActions
        size="icon-lg"
        label={t.page.menu}
        actions={[
          {
            key: "delete",
            label: t.delete.label,
            icon: IconTrash,
            onSelect: () => setDeleting(true),
          },
        ]}
      />
      <ConfirmDialog
        open={deleting}
        onOpenChange={(open) => {
          setDeleting(open);
          if (!open) setError(null);
        }}
        title={t.delete.title}
        description={t.delete.body}
        cancelLabel={fr.masterPage.form.cancel}
        closeLabel={t.page.close}
        confirmLabel={t.delete.label}
        destructive
        pending={pending}
        error={error}
        onConfirm={() =>
          startTransition(async () => {
            const result = await deleteStudioSession(session.id);
            if (!result.ok) return setError(result.error);
            toast.success(t.delete.done);
            router.push(afterDeleteHref);
          })
        }
      />
    </div>
  );
}
