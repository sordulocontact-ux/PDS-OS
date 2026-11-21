"use client";

import { useState } from "react";

import { CallPlanForm } from "@/components/calls/call-plan-form";
import { DealCallAgendaPreview } from "@/components/deals/deal-call-agenda-preview";
import { NegotiationCallSlots } from "@/components/deals/negotiation-call-slots";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { toast } from "@/components/ui/toast";
import type { FreeSlot } from "@/lib/calendar/free-slots";
import type { NegotiationCallData } from "@/lib/deals/negotiation-call";
import { planNegotiationCall } from "@/lib/deals/negotiation-call-actions";
import { dealCalls } from "@/lib/i18n/fr/deal-calls";
import { dialogs } from "@/lib/i18n/fr/dialogs";

const fr = { dealCalls, dialogs };

/**
 * « Caler le call » (Ibé 18/11/2026): the project's owner plans the call of
 * negotiation between the business manager and the artist's manager, on
 * his free slots (NegotiationCallSlots), then the call form of Calls (name,
 * guests, slot, Meet). On a deal (its page) or on a participation without
 * one (the « Titres et artistes » board: the gesture opens its deal, given
 * to the negotiator chosen). The page stays; the call is the deal's,
 * recorded by its negotiator. Data: loadDealNegotiationCall or
 * loadParticipationNegotiationCall (lib/deals/negotiation-call.ts).
 */
export function NegotiationCallButton({
  data,
  variant = "default",
  size = "default",
}: {
  data: NegotiationCallData;
  variant?: "default" | "outline";
  size?: "default" | "sm";
}) {
  const t = fr.dealCalls.negotiation;
  const [open, setOpen] = useState(false);
  const [who, setWho] = useState<string | null>(
    data.negotiators.length === 1 ? data.negotiators[0].id : null,
  );
  const [slot, setSlot] = useState<FreeSlot | "other" | null>(null);
  const negotiator = data.negotiators.find((n) => n.id === who) ?? null;
  const close = () => {
    setOpen(false);
    setSlot(null);
  };
  const hidden: Record<string, string> = {
    ...("dealId" in data.target
      ? { dealId: data.target.dealId }
      : { participationId: data.target.participationId }),
    ...(!data.fixed && who ? { assigneeId: who } : {}),
  };

  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)}>
        {t.button}
      </Button>
      <FormDialog
        open={open}
        onOpenChange={(o) => (o ? setOpen(true) : close())}
        title={t.dialogTitle}
        description={t.description(negotiator?.name ?? null)}
        closeLabel={fr.dialogs.close}
        size="wide"
      >
        {open &&
          (slot === null ? (
            <NegotiationCallSlots
              negotiators={data.negotiators}
              fixed={data.fixed}
              who={who}
              onWho={setWho}
              onPick={setSlot}
            />
          ) : (
            <CallPlanForm
              action={planNegotiationCall}
              hidden={hidden}
              defaultTitle={data.title}
              titlePlaceholder={t.titlePlaceholder}
              defaultOccurredAt={slot === "other" ? "" : slot.local}
              defaultEnd={slot === "other" ? undefined : slot.end}
              members={
                negotiator
                  ? [{ personId: negotiator.id, name: negotiator.name }]
                  : []
              }
              memberDetail={t.who}
              defaultMemberIds={negotiator ? [negotiator.id] : []}
              contacts={data.contacts}
              googleMeet={data.googleMeet}
              submitLabel={t.submit}
              pendingLabel={t.pending}
              cancelLabel={t.back}
              onCancel={() => setSlot(null)}
              onSaved={() => {
                toast.success(t.done);
                close();
              }}
              extra={
                <DealCallAgendaPreview
                  id="negotiation-call-agenda"
                  topics={data.topics}
                />
              }
            />
          ))}
      </FormDialog>
    </>
  );
}
