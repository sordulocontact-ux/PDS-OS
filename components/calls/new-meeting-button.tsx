"use client";

import { IconPlus } from "nucleo-sharp-essential";
import { createContext, useContext, useMemo, useState } from "react";

import { CallPlanForm } from "@/components/calls/call-plan-form";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { createMeeting } from "@/lib/calls/actions";
import type { CallContact } from "@/lib/calls/invite";
import type { SlotInput } from "@/lib/calls/slot";
import { calls } from "@/lib/i18n/fr/calls";

const fr = { calls };

/** What the meeting form needs, read by the server. */
export type MeetingFormData = {
  // Who can be invited in the app: the other active members.
  members: { personId: string; name: string }[];
  contacts: CallContact[];
  // Google Calendar connected: a Meet link is created.
  googleMeet: boolean;
  // "YYYY-MM-DDTHH:mm", Paris time, or "" (nothing said by PO).
  defaultOccurredAt: string;
};

type Composer = {
  // Opens « Nouvelle réunion », on a slot picked in the calendar or not.
  open: (slot?: SlotInput) => void;
};

const ComposerContext = createContext<Composer | null>(null);

/** The meeting composer of the Calls page, used by its button and calendar. */
export function useMeetingComposer(): Composer {
  const composer = useContext(ComposerContext);
  if (!composer) throw new Error("useMeetingComposer outside its provider");
  return composer;
}

/**
 * « Nouvelle réunion » (Calls page): an internal meeting, outside any project,
 * in the modal, opened by the header's button or by a click (or a drag) on
 * the calendar, as in Teams. Created, it opens on its own page.
 */
export function MeetingComposerProvider({
  data,
  children,
}: {
  data: MeetingFormData;
  children: React.ReactNode;
}) {
  const t = fr.calls.meeting;
  const [open, setOpen] = useState(false);
  const [slot, setSlot] = useState<SlotInput | null>(null);
  const composer = useMemo<Composer>(
    () => ({
      open: (picked) => {
        setSlot(picked ?? null);
        setOpen(true);
      },
    }),
    [],
  );

  return (
    <ComposerContext.Provider value={composer}>
      {children}
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t.title}
        description={t.description}
        closeLabel={fr.calls.link.close}
        size="wide"
      >
        <MeetingForm
          {...data}
          defaultOccurredAt={
            slot ? `${slot.date}T${slot.start}` : data.defaultOccurredAt
          }
          defaultEnd={slot?.end}
          onCancel={() => setOpen(false)}
        />
      </FormDialog>
    </ComposerContext.Provider>
  );
}

/** The header's « Nouvelle réunion », on the next round hour. */
// `label`: the Calendrier says « Nouveau call » (27/11/2026).
export function NewMeetingButton({ label }: { label?: string } = {}) {
  const { open } = useMeetingComposer();
  return (
    <Button type="button" size="lg" onClick={() => open()}>
      <IconPlus aria-hidden data-icon="inline-start" />
      {label ?? fr.calls.meeting.new}
    </Button>
  );
}

/**
 * The meeting's fields (CallPlanForm). Created, it opens on its page, unless
 * `onSaved` is given (PO's panel): then the page stays and gets the new
 * meeting's id.
 */
export function MeetingForm({
  members,
  contacts,
  googleMeet,
  defaultOccurredAt,
  defaultEnd,
  defaults,
  defaultContactIds,
  onSaved,
  onCancel,
}: MeetingFormData & {
  defaultEnd?: string;
  // Réseau contacts invited from the start (a contact's side sheet).
  defaultContactIds?: string[];
  // A draft of PO: title, link and guests already filled.
  defaults?: { title: string; meetingUrl: string; attendeeIds: string[] };
  onSaved?: (id: string) => void;
  onCancel: () => void;
}) {
  const t = fr.calls.meeting;
  return (
    <CallPlanForm
      action={createMeeting}
      hidden={onSaved ? { stay: "1" } : undefined}
      defaultTitle={defaults?.title}
      titlePlaceholder={t.titlePlaceholder}
      defaultOccurredAt={defaultOccurredAt}
      defaultEnd={defaultEnd}
      members={members}
      memberDetail={fr.calls.schedule.memberDetail}
      defaultMemberIds={defaults?.attendeeIds ?? []}
      defaultContactIds={defaultContactIds}
      contacts={contacts}
      participantsHint={fr.calls.schedule.participantsHint}
      googleMeet={googleMeet}
      defaultUrl={defaults?.meetingUrl || undefined}
      submitLabel={t.submit}
      pendingLabel={t.pending}
      cancelLabel={t.cancel}
      onCancel={onCancel}
      onSaved={onSaved}
    />
  );
}
