"use client";

import { useState, useTransition } from "react";

import { RescheduleForm } from "@/components/calls/calendar/reschedule-dialog";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { toast } from "@/components/ui/toast";
import { toParisLocalInput } from "@/lib/calls/format";
import { rescheduleCall } from "@/lib/calls/reschedule-actions";
import { calls } from "@/lib/i18n/fr/calls";
import { parisInstant } from "@/lib/utils/calendar-period";

const fr = { calls };

// A call without an end takes 30 minutes, as the call form.
const DEFAULT_MINUTES = 30;

type MovableCall = { id: string; occurredAt: string; endsAt: string | null };

/**
 * « Modifier l'horaire » of a call outside the calendar (its page; Sacha
 * 21/11/2026): the calendar's dialog, saved by rescheduleCall. Shown to
 * whoever may move it, before anything is recorded.
 */
export function RescheduleCallButton({
  call,
  size = "sm",
}: {
  call: MovableCall;
  size?: "sm" | "default";
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size={size} onClick={() => setOpen(true)}>
        {fr.calls.calendar.reschedule.title}
      </Button>
      <RescheduleCallDialog call={call} open={open} onOpenChange={setOpen} />
    </>
  );
}

/** The dialog alone, opened from a menu (a deal's call card). */
export function RescheduleCallDialog({
  call,
  open,
  onOpenChange: setOpen,
}: {
  call: MovableCall;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = fr.calls.calendar.reschedule;
  const [pending, startTransition] = useTransition();
  const start = toParisLocalInput(new Date(call.occurredAt));
  const end = toParisLocalInput(
    new Date(
      call.endsAt ??
        new Date(call.occurredAt).getTime() + DEFAULT_MINUTES * 60_000,
    ),
  );
  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      title={t.title}
      description={t.description}
      closeLabel={fr.calls.calendar.peek.close}
    >
      {open && (
        <RescheduleForm
          id={call.id}
          initial={{
            date: start.slice(0, 10),
            start: start.slice(11),
            end: end.slice(11),
          }}
          pending={pending}
          onCancel={() => setOpen(false)}
          onSave={(place) =>
            startTransition(async () => {
              const result = await rescheduleCall(
                call.id,
                parisInstant(place.day, place.start).toISOString(),
                parisInstant(place.day, place.end).toISOString(),
              );
              if (!result.ok) {
                toast.error(fr.calls.errors[result.error]);
                return;
              }
              if (result.googleFailed)
                toast.warning(fr.calls.calendar.googleMoveFailed);
              else toast.success(fr.calls.calendar.moved);
              setOpen(false);
            })
          }
        />
      )}
    </FormDialog>
  );
}
