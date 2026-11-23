"use client";

import { IconPenWriting2 } from "nucleo-sharp-essential";
import dynamic from "next/dynamic";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { mailboxCompose } from "@/lib/i18n/fr/mailbox-compose";

import { emptyDraft } from "./mail-compose-draft";

const MailComposeDialog = dynamic(() =>
  import("./mail-compose-dialog").then((m) => m.MailComposeDialog),
);

/** « Écrire un mail »: the main button of the page, opens an empty window. */
export function MailComposeButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <IconPenWriting2 aria-hidden />
        {mailboxCompose.write}
      </Button>
      {open && (
        <MailComposeDialog
          open={open}
          onOpenChange={setOpen}
          draft={emptyDraft}
        />
      )}
    </>
  );
}
