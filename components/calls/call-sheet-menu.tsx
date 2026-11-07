"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  IconClipboard,
  IconLink,
  IconPaperPlane2,
  IconTrash,
} from "nucleo-sharp-essential";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { RowActions, type RowAction } from "@/components/ui/row-actions";
import { toast } from "@/components/ui/toast";
import { deleteCall } from "@/lib/calls/delete-actions";
import {
  callSheetSubject,
  callSheetText,
  type SheetCall,
} from "@/lib/calls/sheet";
import { calls } from "@/lib/i18n/fr/calls";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { mailtoHref } from "@/lib/utils/mailto";

const fr = { calls, dialogs };

export type CallMenuCall = SheetCall & {
  id: string;
  // The guests outside the team: the sheet's e-mail goes to them.
  guestEmails: string[];
};

const copy = (text: string, done: string) =>
  void navigator.clipboard
    .writeText(text)
    .then(() => toast.success(done))
    .catch(() => toast.error(fr.calls.details.shareCopyFailed));

/**
 * « ⋯ » of a call, the same on its page and on its row in a list of calls:
 * the video link copied, its sheet for people outside the label (when, how
 * long, the agenda, the video link; lib/calls/sheet.ts) copied or written
 * as an e-mail from one's own mailbox. For the director and whoever works
 * on the call (`deletable`, lib/calls/delete-rule.ts), « Supprimer la
 * réunion » too, asked first. The sheet is written by the
 * code from the call, when it is asked for.
 */
export function CallSheetMenu({
  call,
  deletable = false,
  afterDeleteHref,
  size = "icon-lg",
  reveal = false,
}: {
  call: CallMenuCall;
  // The viewer may delete this call (lib/calls/delete-rule.ts): the SQL has
  // the last word.
  deletable?: boolean;
  // Where the page goes once the call is gone; a list stays (the action
  // revalidates it).
  afterDeleteHref?: string;
  // `icon-sm` + `reveal`: on a row, shown on hover with a mouse.
  size?: "icon-sm" | "icon-lg";
  reveal?: boolean;
}) {
  const t = fr.calls.details;
  const d = fr.calls.page.delete;
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const meetingUrl = call.meetingUrl;
  const actions: RowAction[] = [
    ...(meetingUrl
      ? [
          {
            key: "link",
            label: fr.calls.page.copyMeetingLink,
            icon: IconLink,
            onSelect: () => copy(meetingUrl, t.copied),
          },
        ]
      : []),
    {
      key: "copy",
      label: t.shareCopy,
      icon: IconClipboard,
      onSelect: () => copy(callSheetText(call), t.shareCopied),
    },
    {
      key: "email",
      label: fr.calls.page.sheetEmail,
      icon: IconPaperPlane2,
      onSelect: () =>
        window.location.assign(
          mailtoHref(
            call.guestEmails.join(","),
            callSheetSubject(call),
            callSheetText(call),
          ),
        ),
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
  ];
  return (
    <>
      <RowActions
        label={fr.calls.page.more(call.title)}
        size={size}
        reveal={reveal}
        actions={actions}
      />
      <ConfirmDialog
        open={asking}
        onOpenChange={(next) => {
          setError(null);
          setAsking(next);
        }}
        title={d.title(call.title)}
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
            const result = await deleteCall(call.id);
            if (!result.ok) return setError(result.error);
            toast.success(d.done);
            setAsking(false);
            if (afterDeleteHref) router.push(afterDeleteHref);
          })
        }
      />
    </>
  );
}
