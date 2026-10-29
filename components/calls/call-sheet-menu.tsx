"use client";

import { IconClipboard, IconPaperPlane2 } from "nucleo-sharp-essential";
import { toast } from "sonner";

import { RowActions } from "@/components/ui/row-actions";
import { calls } from "@/lib/i18n/fr/calls";

const fr = { calls };

/**
 * « ⋯ » of a call's page: its sheet for people outside the label (when, how
 * long, the agenda, the video link; lib/calls/sheet.ts), copied or written
 * as an e-mail from one's own mailbox — PDS OS sends nothing itself.
 */
export function CallSheetMenu({
  title,
  sheet,
  mailto,
}: {
  title: string;
  sheet: string;
  // The ready e-mail to the call's guests (mailtoHref).
  mailto: string;
}) {
  const t = fr.calls.details;
  return (
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
      ]}
    />
  );
}
