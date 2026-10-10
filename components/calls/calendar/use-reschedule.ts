"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { parisInstant, type CalendarEvent } from "@/lib/calls/calendar";
import { rescheduleCall } from "@/lib/calls/reschedule-actions";
import { fr } from "@/lib/i18n/fr";

type Place = { day: string; start: number; end: number };

/**
 * A call moved or stretched in the calendar: shown at its new place at once
 * (optimistic), saved by the server, put back where it was if refused. The
 * server's next data carries the move and replaces the local places.
 */
export function useReschedule(events: CalendarEvent[]) {
  const [, startTransition] = useTransition();
  const [moves, setMoves] = useState<{
    source: CalendarEvent[];
    places: Map<string, Place>;
  }>({ source: events, places: new Map() });
  // New data from the server: the moves are in it.
  const places =
    moves.source === events ? moves.places : new Map<string, Place>();
  if (moves.source !== events) setMoves({ source: events, places });

  const shown = events.map((event) => {
    const place = places.get(event.call.id);
    return place ? { ...event, ...place } : event;
  });

  function setPlace(id: string, place: Place | null) {
    setMoves((current) => {
      const next = new Map(current.places);
      if (place) next.set(id, place);
      else next.delete(id);
      return { source: current.source, places: next };
    });
  }

  function move(event: CalendarEvent, place: Place) {
    if (
      place.day === event.day &&
      place.start === event.start &&
      place.end === event.end
    )
      return;
    setPlace(event.call.id, place);
    startTransition(async () => {
      const result = await rescheduleCall(
        event.call.id,
        parisInstant(place.day, place.start).toISOString(),
        parisInstant(place.day, place.end).toISOString(),
      );
      if (!result.ok) {
        setPlace(event.call.id, null);
        toast.error(fr.calls.errors[result.error]);
      } else if (result.googleFailed)
        toast.warning(fr.calls.calendar.googleMoveFailed);
    });
  }

  return { shown, move };
}
