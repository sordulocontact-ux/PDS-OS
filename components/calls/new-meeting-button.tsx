"use client";

import { IconPlus } from "nucleo-sharp-essential";
import { useActionState, useEffect, useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { PeoplePicker } from "@/components/ui/people-picker";
import { createMeeting } from "@/lib/calls/actions";
import { fr } from "@/lib/i18n/fr";

type Person = { personId: string; name: string };

/**
 * "Nouvelle réunion" (Calls page): an internal meeting, outside any project,
 * in the modal. Created, it opens on its own page, ready to record.
 */
export function NewMeetingButton({
  members,
  defaultOccurredAt,
}: {
  // Who can be invited: the other active members.
  members: Person[];
  // "YYYY-MM-DDTHH:mm", Paris time (datetime-local).
  defaultOccurredAt: string;
}) {
  const t = fr.calls.meeting;
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" size="lg" onClick={() => setOpen(true)}>
        <IconPlus aria-hidden data-icon="inline-start" />
        {t.new}
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t.title}
        description={t.description}
        closeLabel={fr.calls.link.close}
      >
        <MeetingForm
          members={members}
          defaultOccurredAt={defaultOccurredAt}
          onCancel={() => setOpen(false)}
        />
      </FormDialog>
    </>
  );
}

/**
 * The meeting's fields. Created, it opens on its page, unless `onSaved` is
 * given (PO's panel): then the page stays and gets the new meeting's id.
 */
export function MeetingForm({
  members,
  defaultOccurredAt,
  defaults,
  onSaved,
  onCancel,
}: {
  members: Person[];
  defaultOccurredAt: string;
  // A draft of PO: title, link and guests already filled.
  defaults?: { title: string; meetingUrl: string; attendeeIds: string[] };
  onSaved?: (id: string) => void;
  onCancel: () => void;
}) {
  const t = fr.calls.meeting;
  const create = fr.calls.create;
  const [state, formAction, pending] = useActionState(createMeeting, null);

  useEffect(() => {
    if (state?.ok && state.id) onSaved?.(state.id);
    // onSaved changes with each render of the parent; the result is what counts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // datetime-local has no zone: convert with the browser's zone before sending.
  const submit = (form: FormData) => {
    const date = new Date(String(form.get("occurredAtLocal") ?? ""));
    form.set(
      "occurredAt",
      Number.isNaN(date.getTime()) ? "" : date.toISOString(),
    );
    formAction(form);
  };

  return (
    <form action={submit} className="flex flex-col gap-5">
      {onSaved && <input type="hidden" name="stay" value="1" />}
      <Field
        name="title"
        label={create.fieldTitle}
        required
        maxLength={200}
        autoComplete="off"
        placeholder={t.titlePlaceholder}
        defaultValue={defaults?.title}
      />
      <Field
        name="occurredAtLocal"
        type="datetime-local"
        label={t.fieldDate}
        required
        defaultValue={defaultOccurredAt}
        hint={create.dateHint}
        className="h-10 w-fit text-base md:text-sm"
      />
      <Field
        name="meetingUrl"
        type="url"
        inputMode="url"
        label={create.fieldLink}
        maxLength={500}
        autoComplete="off"
        placeholder={create.linkPlaceholder}
        hint={create.linkHint}
        defaultValue={defaults?.meetingUrl}
      />
      <PeoplePicker
        name="attendees"
        label={t.fieldAttendees}
        hint={t.attendeesHint}
        emptyLabel={t.noMembers}
        candidates={members}
        defaultSelectedIds={defaults?.attendeeIds ?? []}
      />
      {state && !state.ok && (
        <FormMessage kind="error">{fr.calls.errors[state.error]}</FormMessage>
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" size="lg" onClick={onCancel}>
          {t.cancel}
        </Button>
        <Button
          type="submit"
          size="lg"
          disabled={pending}
          aria-busy={pending || undefined}
        >
          {pending ? t.pending : t.submit}
        </Button>
      </div>
    </form>
  );
}
