/**
 * The time slot of a call in the form: a day and two times ("YYYY-MM-DD",
 * "HH:mm"), typed in the browser's zone. Pure functions, shared by the form
 * and the calendar.
 */

export const DEFAULT_CALL_MINUTES = 30;

export type SlotInput = { date: string; start: string; end: string };

const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function minutesOf(time: string): number | null {
  const match = TIME.exec(time);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

export function timeOf(minutes: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, minutes));
  return `${String(Math.floor(clamped / 60)).padStart(2, "0")}:${String(clamped % 60).padStart(2, "0")}`;
}

/** The slot's length in minutes, or null when it is not a valid slot. */
export function slotMinutes(slot: SlotInput): number | null {
  const start = minutesOf(slot.start);
  const end = minutesOf(slot.end);
  return start === null || end === null || end <= start ? null : end - start;
}

/** A default slot from "YYYY-MM-DDTHH:mm" (empty: an empty slot to fill). */
export function slotFrom(local: string): SlotInput {
  const [date = "", time = ""] = local.split("T");
  const start = minutesOf(time);
  return {
    date,
    start: start === null ? "" : time,
    end: start === null ? "" : timeOf(start + DEFAULT_CALL_MINUTES),
  };
}

/** The start moved: the end follows, keeping the slot's length (Teams). */
export function moveStart(slot: SlotInput, start: string): SlotInput {
  const before = minutesOf(slot.start);
  const after = minutesOf(start);
  const length = slotMinutes(slot) ?? DEFAULT_CALL_MINUTES;
  if (after === null) return { ...slot, start };
  return {
    ...slot,
    start,
    end: before === null && slot.end ? slot.end : timeOf(after + length),
  };
}

/** The ISO instant of a day and a time, in the browser's zone. */
export function instantOf(date: string, time: string): string {
  const value = new Date(`${date}T${time}`);
  return Number.isNaN(value.getTime()) ? "" : value.toISOString();
}
