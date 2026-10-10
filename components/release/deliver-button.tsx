"use client";

import { useState, useTransition, type FormEvent } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { PersonPickerField } from "@/components/network/person-picker-field";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { fr } from "@/lib/i18n/fr";
import {
  listDistributorOptions,
  recordDelivery,
} from "@/lib/release/delivery-actions";

// Today in the browser's time zone, as the date field expects it.
const today = () => new Date().toLocaleDateString("sv-SE");

/** « Valider la livraison »: the distributor (a contact of the Réseau, never
 * a name alone), the day it left, a note. */
export function DeliverButton({ projectId }: { projectId: string }) {
  const t = fr.releaseDelivery;
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="lg" onClick={() => setOpen(true)}>
        {t.deliver}
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t.deliverTitle}
        description={t.deliverDescription}
        closeLabel={t.close}
      >
        <DeliverForm projectId={projectId} onDone={() => setOpen(false)} />
      </FormDialog>
    </>
  );
}

function DeliverForm({
  projectId,
  onDone,
}: {
  projectId: string;
  onDone: () => void;
}) {
  const t = fr.releaseDelivery;
  const [pending, startTransition] = useTransition();
  const [contactError, setContactError] = useState<string>();
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    // A contact added from the picker submits its own form (in a modal),
    // which bubbles here through the portal: not this form's submit.
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const contactId = String(data.get("contactId") ?? "");
    if (!contactId) {
      setContactError(t.distributorRequired);
      form.querySelector<HTMLInputElement>("input:not([type=hidden])")?.focus();
      return;
    }
    setContactError(undefined);
    setError(null);
    startTransition(async () => {
      const result = await recordDelivery({
        projectId,
        contactId,
        deliveredOn: String(data.get("deliveredOn") ?? ""),
        note: String(data.get("note") ?? ""),
      });
      if (result.ok) onDone();
      else setError(result.error);
    });
  }

  return (
    <form noValidate className="flex flex-col gap-5" onSubmit={submit}>
      <PersonPickerField
        refName="contactId"
        nameName="contactName"
        legend={t.distributor}
        load={() => listDistributorOptions()}
        defaultRef={null}
        defaultName={null}
        createRoles={["distributor"]}
        createKind="organization"
        refOfContact={(id) => id}
        allowNameOnly={false}
        required
        error={contactError}
      />
      <Field
        name="deliveredOn"
        label={t.deliveredOn}
        type="date"
        required
        defaultValue={today()}
        max={today()}
      />
      <TextareaField
        name="note"
        label={t.note}
        hint={t.noteHint}
        rows={2}
        maxLength={1000}
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" size="lg" onClick={onDone}>
          {t.cancel}
        </Button>
        <Button
          type="submit"
          size="lg"
          disabled={pending}
          aria-busy={pending || undefined}
        >
          {pending ? t.submitting : t.submit}
        </Button>
      </div>
    </form>
  );
}
