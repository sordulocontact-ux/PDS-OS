"use client";

import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import {
  CallSlotFields,
  type SlotErrors,
} from "@/components/calls/call-slot-fields";
import { clock } from "@/components/calls/calendar-event";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import type { CalendarEvent } from "@/lib/calls/calendar";
import { minutesOf, slotMinutes, type SlotInput } from "@/lib/calls/slot";
import { fr } from "@/lib/i18n/fr";

type Place = { day: string; start: number; end: number };

/**
 * « Modifier l'horaire » of a call: the same move as a drag in the calendar,
 * by the keyboard (WCAG 2.5.7), with the day and the two times of Teams.
 */
export function RescheduleDialog({
  event,
  onClose,
  onSave,
}: {
  event: CalendarEvent | null;
  onClose: () => void;
  onSave: (event: CalendarEvent, place: Place) => void;
}) {
  const t = fr.calls.calendar.reschedule;
  return (
    <FormDialog
      open={event !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={t.title}
      description={t.description}
      closeLabel={fr.calls.calendar.peek.close}
    >
      {event && (
        <RescheduleForm
          event={event}
          onCancel={onClose}
          onSave={(place) => {
            onSave(event, place);
            onClose();
          }}
        />
      )}
    </FormDialog>
  );
}

function RescheduleForm({
  event,
  onCancel,
  onSave,
}: {
  event: CalendarEvent;
  onCancel: () => void;
  onSave: (place: Place) => void;
}) {
  const t = fr.calls.calendar.reschedule;
  const s = fr.calls.schedule;
  const [slot, setSlot] = useState<SlotInput>({
    date: event.day,
    start: clock(event.start),
    end: clock(event.end),
  });
  const [tried, setTried] = useState(false);
  const errors: SlotErrors = !tried
    ? {}
    : {
        date: slot.date ? undefined : s.dateMissing,
        start: slot.start ? undefined : s.startMissing,
        end: !slot.end
          ? s.endMissing
          : slotMinutes(slot) === null
            ? s.endBeforeStart
            : undefined,
      };
  const missing = Object.values(errors).filter(Boolean).length;

  return (
    <form
      noValidate
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        setTried(true);
        const start = minutesOf(slot.start);
        const end = minutesOf(slot.end);
        if (!slot.date || start === null || end === null || end <= start)
          return;
        onSave({ day: slot.date, start, end });
      }}
    >
      <CallSlotFields
        idPrefix={`reschedule-${event.call.id}`}
        slot={slot}
        onChange={setSlot}
        errors={errors}
      />
      {missing > 0 && (
        <FormMessage kind="error">{s.missingCount(missing)}</FormMessage>
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" size="lg" onClick={onCancel}>
          {t.cancel}
        </Button>
        <Button type="submit" size="lg">
          {t.save}
        </Button>
      </div>
    </form>
  );
}
