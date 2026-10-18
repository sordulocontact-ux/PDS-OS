// Dates of a call as the proto writes them, in Paris time. Client-safe.
//   callWhen  → "Mar. 20/10/2026 à 14:00"
//   shortDay  → "14/10"
//   shortStamp → "19/10, 11:16"

const parts = (iso: string) => {
  const map = Object.fromEntries(
    new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Europe/Paris",
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(iso))
      .map((p) => [p.type, p.value]),
  );
  const weekday = String(map.weekday ?? "").replace(/\.$/, "");
  return {
    weekday: weekday.charAt(0).toUpperCase() + weekday.slice(1),
    day: map.day,
    month: map.month,
    year: map.year,
    time: `${map.hour}:${map.minute}`,
  };
};

export function callWhen(iso: string): string {
  const p = parts(iso);
  return `${p.weekday}. ${p.day}/${p.month}/${p.year} à ${p.time}`;
}

export function shortDay(iso: string): string {
  const p = parts(iso);
  return `${p.day}/${p.month}`;
}

export function shortStamp(iso: string): string {
  const p = parts(iso);
  return `${p.day}/${p.month}, ${p.time}`;
}

/** "YYYY-MM-DD" + "HH:mm" typed in the browser → an ISO instant (its zone). */
export function instantOfInputs(date: string, time: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time))
    return null;
  const at = new Date(`${date}T${time}`);
  return Number.isNaN(at.getTime()) ? null : at.toISOString();
}

/** The next round hour, Paris time, as "YYYY-MM-DD" and "HH:mm". */
export function nextRoundHourInputs(now: Date): { date: string; time: string } {
  const next = new Date(now.getTime() + 60 * 60 * 1000);
  const map = Object.fromEntries(
    new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Europe/Paris",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(next)
      .map((p) => [p.type, p.value]),
  );
  return {
    date: `${map.year}-${map.month}-${map.day}`,
    time: `${map.hour}:00`,
  };
}
