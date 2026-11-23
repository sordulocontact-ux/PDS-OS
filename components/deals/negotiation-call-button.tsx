"use client";

import { useState } from "react";

import { CallPlanForm } from "@/components/calls/call-plan-form";
import { DealCallAgendaPreview } from "@/components/deals/deal-call-agenda-preview";
import { DealSlotField } from "@/components/deals/deal-slot-field";
import { EmptyNote } from "@/components/shell/empty-state";
import { Button } from "@/components/ui/button";
import { ChipChoice } from "@/components/ui/chip-choice";
import { FormDialog } from "@/components/ui/form-dialog";
import { toast } from "@/components/ui/toast";
import type { NegotiationCallData } from "@/lib/deals/negotiation-call";
import { planNegotiationCall } from "@/lib/deals/negotiation-call-actions";
import { dealCalls } from "@/lib/i18n/fr/deal-calls";
import { dialogs } from "@/lib/i18n/fr/dialogs";

const fr = { dealCalls, dialogs };

/**
 * « Caler le call » of the project's owner (Ibé 18/11/2026), the same form
 * as the direction's (DealCallButton, Sacha 21/11/2026): the call form of
 * Calls with the business manager's free slots in place of the day and
 * times (DealSlotField). On a deal (its page) or on a participation without
 * one (the « Titres et artistes » board: the gesture opens its deal, given
 * to the negotiator chosen above the form). The page stays. Data:
 * loadDealNegotiationCall or loadParticipationNegotiationCall.
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
  const negotiator = data.negotiators.find((n) => n.id === who) ?? null;
  const close = () => setOpen(false);
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
        onOpenChange={setOpen}
        title={t.dialogTitle}
        description={t.description(negotiator?.name ?? null)}
        closeLabel={fr.dialogs.close}
        size="wide"
      >
        {open &&
          (data.negotiators.length === 0 ? (
            <EmptyNote>{t.noNegotiator}</EmptyNote>
          ) : (
            <div className="flex flex-col gap-6">
              {!data.fixed && data.negotiators.length > 1 && (
                <ChipChoice
                  name="negotiator"
                  legend={t.who}
                  required
                  options={data.negotiators.map((n) => ({
                    value: n.id,
                    label: n.name,
                  }))}
                  value={who}
                  onChange={setWho}
                />
              )}
              {negotiator && (
                <CallPlanForm
                  // A business manager chosen: his slots and his name.
                  key={negotiator.id}
                  action={planNegotiationCall}
                  hidden={hidden}
                  defaultTitle={data.title}
                  titlePlaceholder={t.titlePlaceholder}
                  defaultOccurredAt=""
                  members={[{ personId: negotiator.id, name: negotiator.name }]}
                  memberDetail={t.who}
                  defaultMemberIds={[negotiator.id]}
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
                  slotField={(field) => (
                    <DealSlotField {...field} negotiator={negotiator} />
                  )}
                  extra={
                    <DealCallAgendaPreview
                      id="negotiation-call-agenda"
                      topics={data.topics}
                    />
                  }
                />
              )}
            </div>
          ))}
      </FormDialog>
    </>
  );
}
