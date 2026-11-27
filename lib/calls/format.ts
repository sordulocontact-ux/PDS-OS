/** Display formats for calls. The team works on Paris time. */

import type { CallStatus } from "@/lib/calls/constants";

const dateTime = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Paris",
});

export function formatDateTime(iso: string): string {
  return dateTime.format(new Date(iso));
}

const time = new Intl.DateTimeFormat("fr-FR", {
  timeStyle: "short",
  timeZone: "Europe/Paris",
});

export function formatTime(iso: string): string {
  return time.format(new Date(iso));
}

/** When a call ends: its slot's end, else its agenda's length, else an hour. */
export function callEndOf(call: {
  occurredAt: string;
  endsAt?: string | null;
  durationMinutes?: number | null;
}): string {
  if (call.endsAt) return call.endsAt;
  const start = new Date(call.occurredAt).getTime();
  return new Date(start + (call.durationMinutes ?? 60) * 60_000).toISOString();
}

/** "10 oct. 2026, 14:00 – 14:30" for a slot, the start alone otherwise. */
export function formatSlot(call: {
  occurredAt: string;
  endsAt?: string | null;
}): string {
  const start = formatDateTime(call.occurredAt);
  return call.endsAt ? `${start} – ${formatTime(call.endsAt)}` : start;
}

export function formatMegabytes(bytes: number): string {
  return (bytes / (1024 * 1024)).toLocaleString("fr-FR", {
    maximumFractionDigits: 1,
  });
}

/**
 * A planned call: still a draft (nothing recorded) and not over yet — its
 * slot's end when it has one (a call in progress can still be joined), its
 * start otherwise.
 */
export function isUpcoming(
  call: { status: string; occurredAt: string; endsAt?: string | null },
  now: Date,
): boolean {
  return (
    call.status === "draft" && new Date(call.endsAt ?? call.occurredAt) > now
  );
}

/** "YYYY-MM-DDTHH:mm" in Paris time, the value format of datetime-local. */
export function toParisLocalInput(date: Date): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Paris",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

/** Recording clock: "12:05", or "1:02:05" past an hour. */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${sec}`
    : `${String(m).padStart(2, "0")}:${sec}`;
}

/** A call to come or past (the Notes' tabs, lib/notes/views.ts). */
export type CallView = "upcoming" | "past";

export function callViewOf(
  call: { status: string; occurredAt: string; endsAt?: string | null },
  now: Date,
): CallView {
  return isUpcoming(call, now) ? "upcoming" : "past";
}

/** The next round hour, the default time of a new internal meeting. */
export function nextRoundHourInput(now: Date): string {
  const next = new Date(now);
  next.setMinutes(0, 0, 0);
  next.setHours(next.getHours() + 1);
  return toParisLocalInput(next);
}

/** What a call's state reads as: closed first, then a draft still to come
 * (« À venir », not « À enregistrer »), else its processing. */
export function callStateKey(
  status: CallStatus,
  {
    upcoming = false,
    closed = false,
  }: { upcoming?: boolean; closed?: boolean },
): CallStatus | "upcoming" | "closed" {
  return closed ? "closed" : upcoming ? "upcoming" : status;
}
