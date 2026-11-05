"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  IconClipboard,
  IconPaperPlane2,
  IconTrash,
} from "nucleo-sharp-essential";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { RowActions } from "@/components/ui/row-actions";
import { toast } from "@/components/ui/toast";
import { deleteCall } from "@/lib/calls/delete-actions";
import { calls } from "@/lib/i18n/fr/calls";
import { dialogs } from "@/lib/i18n/fr/dialogs";

const fr = { calls, dialogs };

/**
 * « ⋯ » of a call's page: its sheet for people outside the label (when, how
 * long, the agenda, the video link; lib/calls/sheet.ts), copied or written
 * as an e-mail from one's own mailbox — PDS OS sends nothing itself. For the
 * director (`deletable`), « Supprimer la réunion » too, asked first.
 */
export function CallSheetMenu({
  title,
  sheet,
  mailto,
  callId,
  deletable = false,
  afterDeleteHref,
}: {
  title: string;
  sheet: string;
  // The ready e-mail to the call's guests (mailtoHref).
  mailto: string;
  callId: string;
  // The viewer may delete calls (archive_records): the SQL has the last word.
  deletable?: boolean;
  // Where the page goes once the call is gone.
  afterDeleteHref: string;
}) {
  const t = fr.calls.details;
  const d = fr.calls.page.delete;
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <RowActions
        label={fr.calls.page.more(title)}
        size="icon-lg"
        actions={[
          {
            key: "copy",
            label: t.shareCopy,
            icon: IconClipboard,
            onSelect: () =>
              void navigator.clipboard
                .writeText(sheet)
                .then(() => toast.success(t.shareCopied))
                .catch(() => toast.error(t.shareCopyFailed)),
          },
          {
            key: "email",
            label: fr.calls.page.sheetEmail,
            icon: IconPaperPlane2,
            onSelect: () => window.location.assign(mailto),
          },
          ...(deletable
            ? [
                {
                  key: "delete",
                  label: d.action,
                  icon: IconTrash,
                  onSelect: () => setAsking(true),
                },
              ]
            : []),
        ]}
      />
      <ConfirmDialog
        open={asking}
        onOpenChange={(next) => {
          setError(null);
          setAsking(next);
        }}
        title={d.title(title)}
        description={d.body}
        cancelLabel={fr.dialogs.cancel}
        closeLabel={fr.dialogs.close}
        confirmLabel={d.confirm}
        pendingLabel={d.pending}
        pending={pending}
        destructive
        error={error}
        onConfirm={() =>
          startTransition(async () => {
            const result = await deleteCall(callId);
            if (!result.ok) return setError(result.error);
            toast.success(d.done);
            setAsking(false);
            router.push(afterDeleteHref);
          })
        }
      />
    </>
  );
}
