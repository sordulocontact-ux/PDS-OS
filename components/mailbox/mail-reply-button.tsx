"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { mailboxCompose } from "@/lib/i18n/fr/mailbox-compose";
import type { MailboxMessage } from "@/lib/mailbox/types";

import { replyDraft } from "./mail-compose-draft";

const MailComposeDialog = dynamic(() =>
  import("./mail-compose-dialog").then((m) => m.MailComposeDialog),
);

/** « Répondre »: the writing window filled in for this message. */
export function MailReplyButton({ message }: { message: MailboxMessage }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        {mailboxCompose.reply}
      </Button>
      {open && (
        <MailComposeDialog
          open={open}
          onOpenChange={setOpen}
          draft={replyDraft(message)}
        />
      )}
    </>
  );
}
