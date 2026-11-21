"use client";

import { IconCalendarDays } from "nucleo-sharp-essential";
import { useState } from "react";

import { RescheduleCallDialog } from "@/components/calls/reschedule-call-button";
import { RowActions } from "@/components/ui/row-actions";
import { calls } from "@/lib/i18n/fr/calls";
import { dealCalls } from "@/lib/i18n/fr/deal-calls";

const fr = { calls, dealCalls };

/** « ⋯ » of a deal's call card: « Modifier l'horaire » (Sacha 21/11/2026). */
export function DealCallMenu({
  call,
}: {
  call: {
    id: string;
    title: string;
    occurredAt: string;
    endsAt: string | null;
  };
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <RowActions
        label={fr.dealCalls.actions(call.title)}
        actions={[
          {
            key: "reschedule",
            label: fr.calls.calendar.reschedule.title,
            icon: IconCalendarDays,
            onSelect: () => setOpen(true),
          },
        ]}
      />
      <RescheduleCallDialog call={call} open={open} onOpenChange={setOpen} />
    </>
  );
}
