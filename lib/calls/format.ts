/** Display formats for calls. The team works on Paris time. */

const dateTime = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Paris",
});

export function formatDateTime(iso: string): string {
  return dateTime.format(new Date(iso));
}

export function formatMegabytes(bytes: number): string {
  return (bytes / (1024 * 1024)).toLocaleString("fr-FR", {
    maximumFractionDigits: 1,
  });
}

/** A planned call: still a draft (nothing recorded) and dated in the future. */
export function isUpcoming(
  call: { status: string; occurredAt: string },
  now: Date,
): boolean {
  return call.status === "draft" && new Date(call.occurredAt) > now;
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

/** Views of the Calls page: every call, the planned ones, the others. */
export const CALL_VIEWS = ["upcoming", "past"] as const;
export type CallView = (typeof CALL_VIEWS)[number];

export function asCallView(value: unknown): CallView | null {
  return CALL_VIEWS.find((view) => view === value) ?? null;
}

export function callViewOf(
  call: { status: string; occurredAt: string },
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
