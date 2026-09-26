"use client";

import { IconPaperPlane2 } from "nucleo-sharp-essential";
import { useActionState, useEffect, useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { SubmitButton } from "@/components/auth/submit-button";
import { TextareaField } from "@/components/auth/textarea-field";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { idleFormState } from "@/lib/auth/form-state";
import { fr } from "@/lib/i18n/fr";
import { transmitProject } from "@/lib/projects/transmission-actions";

// "Transmettre à un chef de projet": the director picks a project manager and
// may add a message (the answer to a question, when transmitting again).
export function TransmitDialog({
  projectId,
  people,
  retransmit,
  defaultAssigneeId,
}: {
  projectId: string;
  people: Array<{ personId: string; name: string }>;
  retransmit: boolean;
  defaultAssigneeId?: string;
}) {
  const t = fr.transmission;
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="lg" onClick={() => setOpen(true)}>
        <IconPaperPlane2 aria-hidden data-icon="inline-start" />
        {retransmit ? t.panel.retransmit : t.panel.transmit}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent closeLabel={t.dialog.close}>
          <DialogHeader>
            <DialogTitle>
              {retransmit ? t.dialog.retransmitTitle : t.dialog.title}
            </DialogTitle>
            <DialogDescription>{t.dialog.description}</DialogDescription>
          </DialogHeader>
          {/* Mounted per opening: every opening starts from a blank state. */}
          {open && (
            <TransmitForm
              projectId={projectId}
              people={people}
              defaultAssigneeId={defaultAssigneeId}
              onDone={() => setOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function TransmitForm({
  projectId,
  people,
  defaultAssigneeId,
  onDone,
}: {
  projectId: string;
  people: Array<{ personId: string; name: string }>;
  defaultAssigneeId?: string;
  onDone: () => void;
}) {
  const t = fr.transmission.dialog;
  const [state, action] = useActionState(transmitProject, idleFormState);
  const values = state.status === "error" ? (state.values ?? {}) : {};
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  useEffect(() => {
    if (state.status === "success") onDone();
    // onDone changes identity on every render of the parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      <input type="hidden" name="projectId" value={projectId} />
      <OptionSelect
        name="assigneePersonId"
        label={t.assignee}
        placeholder={t.assigneePlaceholder}
        items={Object.fromEntries(people.map((p) => [p.personId, p.name]))}
        defaultValue={values.assigneePersonId || defaultAssigneeId || null}
        error={errors.assigneePersonId}
      />
      <TextareaField
        name="note"
        label={t.note}
        hint={t.noteHint}
        maxLength={5000}
        defaultValue={values.note ?? ""}
        error={errors.note}
      />
      {state.status === "error" && state.formError && (
        <FormMessage kind="error">{state.formError}</FormMessage>
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" size="lg" onClick={onDone}>
          {t.cancel}
        </Button>
        <SubmitButton pendingLabel={t.submitting}>{t.submit}</SubmitButton>
      </div>
    </form>
  );
}
