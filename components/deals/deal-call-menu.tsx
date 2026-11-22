"use client";

import { IconPenWriting2 } from "nucleo-sharp-essential";
import { useState } from "react";

import { EditCallDialog } from "@/components/calls/edit-call-button";
import { RowActions } from "@/components/ui/row-actions";
import { calls } from "@/lib/i18n/fr/calls";
import { dealCalls } from "@/lib/i18n/fr/deal-calls";

const fr = { calls, dealCalls };

/** « ⋯ » of a deal's call card: « Modifier le call » (Sacha 21/11/2026). */
export function DealCallMenu({
  call,
}: {
  call: { id: string; title: string };
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <RowActions
        label={fr.dealCalls.actions(call.title)}
        actions={[
          {
            key: "edit",
            label: fr.calls.edit.button,
            icon: IconPenWriting2,
            onSelect: () => setOpen(true),
          },
        ]}
      />
      <EditCallDialog callId={call.id} open={open} onOpenChange={setOpen} />
    </>
  );
}
