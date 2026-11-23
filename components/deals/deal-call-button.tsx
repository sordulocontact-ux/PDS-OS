"use client";

import { useState } from "react";

import { CallPlanForm } from "@/components/calls/call-plan-form";
import { DealCallAgendaPreview } from "@/components/deals/deal-call-agenda-preview";
import { DealSlotField } from "@/components/deals/deal-slot-field";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { toast } from "@/components/ui/toast";
import type { CallContact } from "@/lib/calls/invite";
import { createDealCall } from "@/lib/deals/call-actions";
import type { CallNegotiator } from "@/lib/deals/negotiation-call";
import { dealCalls } from "@/lib/i18n/fr/deal-calls";
import { dialogs } from "@/lib/i18n/fr/dialogs";

const fr = { dealCalls, dialogs };

/** What the call of a deal needs, for whoever writes it, read by the server. */
export type DealCallFormData = {
  dealId: string;
  title: string;
  contacts: CallContact[];
  // The Réseau contacts invited by default (pickCallGuests).
  guests: string[];
  googleMeet: boolean;
  // "YYYY-MM-DDTHH:mm", the next round hour in Paris (« Autre horaire »).
  defaultOccurredAt: string;
  // The points the code puts on its agenda (lib/deals/call-prep.ts).
  topics: string[];
  // The deal's business manager: in the call by default (Sacha 21/11/2026).
  negotiator: { id: string; name: string } | null;
  // His free slots, when someone else plans the call (the direction); none
  // when he plans his own: the form at once.
  slots: CallNegotiator[];
};

/**
 * « Caler le call » for whoever writes the deal (the direction, its
 * negotiator), the same as the project's owner's (NegotiationCallButton,
 * Sacha 21/11/2026): the call form with the business manager's free slots
 * in place of the day and times (DealSlotField, « les dispos direct ici »),
 * him among the participants, the agenda folded at the bottom. The page
 * stays; the call is in « Calls » and « Prochaine action ».
 */
export function DealCallButton({
  data,
  variant = "outline",
}: {
  data: DealCallFormData;
  // "default": the main gesture of a deal to contact (its « Maintenant »).
  variant?: "default" | "outline";
}) {
  const t = fr.dealCalls.negotiation;
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const negotiator = data.negotiator;
  const slots = data.slots[0] ?? null;
  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)}>
        {t.button}
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t.dialogTitle}
        description={t.description(negotiator?.name ?? null)}
        closeLabel={fr.dialogs.close}
        size="wide"
      >
        {open && (
          <CallPlanForm
            action={createDealCall}
            hidden={{ dealId: data.dealId, stay: "1" }}
            defaultTitle={data.title}
            titlePlaceholder={t.titlePlaceholder}
            // His free slots: nothing picked yet; else the next round hour.
            defaultOccurredAt={slots ? "" : data.defaultOccurredAt}
            members={
              negotiator
                ? [{ personId: negotiator.id, name: negotiator.name }]
                : []
            }
            memberDetail={t.who}
            defaultMemberIds={negotiator ? [negotiator.id] : []}
            defaultContactIds={data.guests}
            contacts={data.contacts}
            googleMeet={data.googleMeet}
            submitLabel={t.submit}
            pendingLabel={t.pending}
            cancelLabel={fr.dealCalls.prepare.cancel}
            onCancel={close}
            onSaved={(_id, meetFailed) => {
              if (meetFailed) toast.warning(t.meetFailed);
              else toast.success(t.done);
              close();
            }}
            slotField={
              slots
                ? (field) => <DealSlotField {...field} negotiator={slots} />
                : undefined
            }
            extra={
              <DealCallAgendaPreview
                id={`deal-call-agenda-${data.dealId}`}
                topics={data.topics}
              />
            }
          />
        )}
      </FormDialog>
    </>
  );
}
