"use client";

import { useState } from "react";

import { CallPlanForm } from "@/components/calls/call-plan-form";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { Loaded } from "@/components/ui/loaded";
import { toast } from "@/components/ui/toast";
import { loadCallEdit, updateCall } from "@/lib/calls/edit-call-actions";
import { calls } from "@/lib/i18n/fr/calls";
import { records } from "@/lib/i18n/fr/records";

const fr = { calls, records };

/**
 * « Modifier le call » (Sacha 21/11/2026: « une modale pour modifier tout
 * l'appel »): the call form, filled with the call — name, who takes part,
 * day and slot, video link — saved by updateCall. On a call's page; the
 * dialog alone (EditCallDialog) in the « ⋯ » of a deal's call card.
 */
export function EditCallButton({ callId }: { callId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        {fr.calls.edit.button}
      </Button>
      <EditCallDialog callId={callId} open={open} onOpenChange={setOpen} />
    </>
  );
}

export function EditCallDialog({
  callId,
  open,
  onOpenChange,
}: {
  callId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = fr.calls.edit;
  const close = () => onOpenChange(false);
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t.title}
      closeLabel={fr.calls.calendar.peek.close}
      size="wide"
    >
      <Loaded
        load={() => loadCallEdit(callId)}
        loadingLabel={fr.records.edit.loading}
        errorLabel={fr.records.edit.loadFailed}
      >
        {(data) => (
          <CallPlanForm
            action={updateCall}
            hidden={{ callId }}
            defaultTitle={data.title}
            titlePlaceholder={data.title}
            defaultOccurredAt={data.start}
            defaultEnd={data.end}
            members={[]}
            memberDetail=""
            defaultMemberIds={[]}
            contacts={[]}
            people={data.people}
            googleMeet={data.googleMeet}
            defaultUrl={data.meetingUrl ?? undefined}
            submitLabel={t.save}
            pendingLabel={t.saving}
            cancelLabel={t.cancel}
            onCancel={close}
            onSaved={(_id, googleFailed) => {
              if (googleFailed) toast.warning(t.googleFailed);
              else toast.success(t.done);
              close();
            }}
          />
        )}
      </Loaded>
    </FormDialog>
  );
}
