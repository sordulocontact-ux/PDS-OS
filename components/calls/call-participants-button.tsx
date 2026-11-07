"use client";

import { IconUsers2 } from "nucleo-sharp-essential";
import { useId, useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { AttendeeChips } from "@/components/calls/prep/attendee-chips";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { LoadedFormButton } from "@/components/ui/loaded-form-button";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import {
  loadCallParticipants,
  saveCallParticipants,
} from "@/lib/calls/participants-actions";
import {
  participantsPayload,
  type ParticipantsForm,
} from "@/lib/calls/prep/pool";
import { calls } from "@/lib/i18n/fr/calls";

const fr = { calls };

/**
 * « Modifier les participants » of a call already planned, in the
 * Participants card: the same field of chips as « Nouveau call », filled
 * with who takes part now. Shown to whoever works on the call; the RLS
 * checks every write (lib/calls/participants-actions.ts).
 */
export function CallParticipantsButton({
  callId,
  isProject,
}: {
  callId: string;
  // A project's call offers its team, a meeting the label's members.
  isProject: boolean;
}) {
  const t = fr.calls.details.participants;
  return (
    <LoadedFormButton
      label={t.edit}
      icon={IconUsers2}
      variant="outline"
      size="sm"
      className="w-fit"
      dialogSize="medium"
      title={t.title}
      description={t.description}
      closeLabel={t.close}
      load={() => loadCallParticipants(callId)}
    >
      {(data, close) => (
        <ParticipantsEditor
          callId={callId}
          data={data}
          isProject={isProject}
          onDone={close}
        />
      )}
    </LoadedFormButton>
  );
}

function ParticipantsEditor({
  callId,
  data,
  isProject,
  onDone,
}: {
  callId: string;
  data: ParticipantsForm;
  isProject: boolean;
  onDone: () => void;
}) {
  const t = fr.calls.details.participants;
  const id = useId();
  const [people, setPeople] = useState(data.value);
  const { pending, error, run } = useWriteSubmit(onDone, t.done);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const { attendees, guests } = participantsPayload(people);
    run(async () => {
      const result = await saveCallParticipants(callId, attendees, guests);
      if (!result.ok)
        return { ok: false, error: fr.calls.errors[result.error] };
      return result.googleFailed
        ? { ok: true, notice: t.googleFailed }
        : { ok: true, done: t.done };
    });
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <AttendeeChips
        id={`${id}-people`}
        pool={data.pool}
        value={people}
        onChange={setPeople}
        hint={
          isProject
            ? fr.calls.schedule.participantsProjectHint
            : fr.calls.schedule.participantsHint
        }
        filesEmails={false}
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={t.save}
        pendingLabel={t.saving}
        onCancel={onDone}
      />
    </form>
  );
}
