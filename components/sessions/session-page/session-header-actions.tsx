"use client";

import { IconPenWriting2, IconTrash } from "nucleo-sharp-essential";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { IconBan, IconRefresh } from "@/components/icons";
import { SessionFormButton } from "@/components/sessions/session-form-button";
import { StudioSessionForm } from "@/components/sessions/studio-session-form";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormDialog } from "@/components/ui/form-dialog";
import { Loaded } from "@/components/ui/loaded";
import { RowActions, type RowAction } from "@/components/ui/row-actions";
import { toast } from "@/components/ui/toast";
import { records } from "@/lib/i18n/fr/records";
import { masterPage } from "@/lib/i18n/fr/master-page";
import { sessions } from "@/lib/i18n/fr/sessions";
import {
  deleteStudioSession,
  setSessionCancelled,
} from "@/lib/sessions/actions";
import { loadSessionFormData } from "@/lib/sessions/form-data";
import type { StudioSession } from "@/lib/sessions/types";

const fr = { masterPage, records, sessions };

/**
 * « Modifier » and « ⋯ » in the page's head: « Annuler la séance » (the only
 * state anyone sets, after a confirmation) or « Rétablir la séance », and
 * « Supprimer la session ». `inSheet`: the side sheet's bar, « Modifier »
 * inside « ⋯ » (the Réseau's model) and the list kept after a deletion (the
 * sheet closes with its row).
 */
export function SessionHeaderActions({
  session,
  afterDeleteHref,
  inSheet = false,
}: {
  session: StudioSession;
  // The list of the door it was opened from.
  afterDeleteHref?: string;
  inSheet?: boolean;
}) {
  const t = fr.sessions;
  const router = useRouter();
  const [confirming, setConfirming] = useState<"cancel" | "delete" | null>(
    null,
  );
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const cancelled = session.state === "cancelled";

  const restore = () =>
    startTransition(async () => {
      const result = await setSessionCancelled(session.id, false);
      if (result.ok) toast.success(t.page.restored);
      else toast.error(result.error);
    });

  const edit: RowAction[] =
    inSheet && !cancelled
      ? [
          {
            key: "edit",
            label: t.page.edit,
            icon: IconPenWriting2,
            onSelect: () => setEditing(true),
          },
        ]
      : [];

  return (
    <div className="flex flex-wrap gap-2">
      {!cancelled && !inSheet && <SessionFormButton session={session} />}
      <RowActions
        size={inSheet ? "icon-sm" : "icon-lg"}
        label={t.page.menu}
        actions={[
          ...edit,
          cancelled
            ? {
                key: "restore",
                label: t.page.restore,
                icon: IconRefresh,
                onSelect: restore,
              }
            : {
                key: "cancel",
                label: t.page.cancel,
                icon: IconBan,
                onSelect: () => setConfirming("cancel"),
              },
          {
            key: "delete",
            label: t.delete.label,
            icon: IconTrash,
            onSelect: () => setConfirming("delete"),
          },
        ]}
      />
      <ConfirmDialog
        open={confirming !== null}
        onOpenChange={(open) => {
          if (!open) {
            setConfirming(null);
            setError(null);
          }
        }}
        title={confirming === "cancel" ? t.page.cancelTitle : t.delete.title}
        description={
          confirming === "cancel" ? t.page.cancelBody : t.delete.body
        }
        cancelLabel={
          confirming === "cancel" ? t.page.keep : fr.masterPage.form.cancel
        }
        closeLabel={t.page.close}
        confirmLabel={confirming === "cancel" ? t.page.cancel : t.delete.label}
        destructive={confirming === "delete"}
        pending={pending}
        error={error}
        onConfirm={() =>
          startTransition(async () => {
            if (confirming === "cancel") {
              const result = await setSessionCancelled(session.id, true);
              if (!result.ok) return setError(result.error);
              toast.success(t.page.cancelled);
              setConfirming(null);
              return;
            }
            const result = await deleteStudioSession(session.id);
            if (!result.ok) return setError(result.error);
            toast.success(t.delete.done);
            setConfirming(null);
            if (afterDeleteHref) router.push(afterDeleteHref);
          })
        }
      />
      {inSheet && (
        <FormDialog
          open={editing}
          onOpenChange={setEditing}
          title={t.form.editTitle}
          description={t.form.description}
          closeLabel={t.page.close}
        >
          <Loaded
            load={loadSessionFormData}
            loadingLabel={fr.records.edit.loading}
            errorLabel={fr.records.edit.loadFailed}
          >
            {(data) => (
              <StudioSessionForm
                data={data}
                session={session}
                onDone={() => setEditing(false)}
              />
            )}
          </Loaded>
        </FormDialog>
      )}
    </div>
  );
}
