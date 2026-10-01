"use client";

import { IconLink } from "nucleo-sharp-essential";
import { useState, useTransition } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { updateCallLink } from "@/lib/calls/actions";
import { fr } from "@/lib/i18n/fr";

/**
 * Adds or changes a call's video link, in the modal. Shown to whoever works
 * on the call (project owner, meeting creator); the database checks.
 */
export function CallLinkButton({
  callId,
  meetingUrl,
}: {
  callId: string;
  meetingUrl: string | null;
}) {
  const t = fr.calls.link;
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="ghost" onClick={() => setOpen(true)}>
        <IconLink aria-hidden data-icon="inline-start" />
        {meetingUrl ? t.edit : t.add}
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t.title}
        description={t.description}
        closeLabel={t.close}
      >
        <CallLinkForm
          callId={callId}
          meetingUrl={meetingUrl}
          onDone={() => setOpen(false)}
        />
      </FormDialog>
    </>
  );
}

function CallLinkForm({
  callId,
  meetingUrl,
  onDone,
}: {
  callId: string;
  meetingUrl: string | null;
  onDone: () => void;
}) {
  const t = fr.calls.link;
  const [value, setValue] = useState(meetingUrl ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await updateCallLink(callId, value);
      if (result.ok) onDone();
      else setError(fr.calls.errors[result.error]);
    });
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <Field
        name="meetingUrl"
        type="url"
        inputMode="url"
        label={fr.calls.create.fieldLink}
        autoComplete="off"
        maxLength={500}
        placeholder={fr.calls.create.linkPlaceholder}
        value={value}
        disabled={pending}
        onChange={(event) => setValue(event.target.value)}
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
          {pending ? t.saving : t.save}
        </Button>
      </div>
    </form>
  );
}
