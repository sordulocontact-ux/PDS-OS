"use client";

import { useState } from "react";

import { CallPlanForm } from "@/components/calls/call-plan-form";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { DealCallAgendaPreview } from "@/components/deals/deal-call-agenda-preview";
import type { CallContact } from "@/lib/calls/invite";
import { createDealCall } from "@/lib/deals/call-actions";
import { calls } from "@/lib/i18n/fr/calls";
import { dealCalls } from "@/lib/i18n/fr/deal-calls";
import { dialogs } from "@/lib/i18n/fr/dialogs";

const fr = { calls, dealCalls, dialogs };

/** What « Préparer un call » needs, read by the server. */
export type DealCallFormData = {
  dealId: string;
  title: string;
  contacts: CallContact[];
  googleMeet: boolean;
  // "YYYY-MM-DDTHH:mm", the next round hour in Paris.
  defaultOccurredAt: string;
  // The points the code puts on its agenda (lib/deals/call-prep.ts).
  topics: string[];
  // The deal's business manager: in the call by default (Sacha 21/11/2026).
  negotiator: { id: string; name: string } | null;
};

/**
 * « Préparer un call » of a deal (BIZ 6): the call form of Calls (name,
 * guests from the Réseau or by e-mail, slot, video link), its agenda folded
 * at the bottom (DealCallAgendaPreview), as the code will write it.
 * The deal's business manager is among the participants by default (invited
 * to the Meet); whoever reads the deal sees the call.
 */
export function DealCallButton({
  data,
  variant = "outline",
}: {
  data: DealCallFormData;
  // "default": the main gesture of a deal to contact (its « Maintenant »).
  variant?: "default" | "outline";
}) {
  const t = fr.dealCalls.prepare;
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)}>
        {t.button}
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t.dialogTitle}
        description={t.description}
        closeLabel={fr.dialogs.close}
        size="wide"
      >
        {open && (
          <CallPlanForm
            action={createDealCall}
            hidden={{ dealId: data.dealId }}
            defaultTitle={data.title}
            titlePlaceholder={t.titlePlaceholder}
            defaultOccurredAt={data.defaultOccurredAt}
            members={
              data.negotiator
                ? [{ personId: data.negotiator.id, name: data.negotiator.name }]
                : []
            }
            memberDetail={fr.dealCalls.negotiation.who}
            defaultMemberIds={data.negotiator ? [data.negotiator.id] : []}
            contacts={data.contacts}
            googleMeet={data.googleMeet}
            submitLabel={t.submit}
            pendingLabel={t.pending}
            cancelLabel={t.cancel}
            onCancel={() => setOpen(false)}
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
