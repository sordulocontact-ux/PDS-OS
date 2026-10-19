// The shoot's date and hours as a decision (proto schedModal): what is
// decided now and what it replaced. Client-safe.

export const SCHEDULE_SOURCES = [
  "meeting",
  "call",
  "whatsapp",
  "email",
  "other",
] as const;
export type ScheduleSource = (typeof SCHEDULE_SOURCES)[number];

export type ScheduleDecision = {
  date: string;
  // « 08:00 ».
  start: string;
  end: string;
  source: ScheduleSource;
  by: string | null;
  at: string;
  replacedAt: string | null;
};

/** « 8 h », « 8 h 30 » (proto hourFr). */
export function hourFr(time: string): string {
  const [h, m] = time.split(":");
  return `${Number(h)} h${m && m !== "00" ? ` ${m}` : ""}`;
}
