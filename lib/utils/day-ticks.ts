const DAY = 86400000;

const time = (day: string) => Date.parse(`${day}T00:00:00Z`);

export type DayTick = { day: string; at: number };

/**
 * The days a chart names under its axis (Ibé, 16/11/2026: « pas assez de
 * données sur la courbe […] qu'on voie soit les jours, soit les mois »):
 * every Monday up to eleven weeks, every other Monday beyond, so a chart
 * keeps eight or nine names whatever its length. `days` are the chart's
 * points in order (a day may repeat: the treasury has today twice, real
 * then forecast); `at` is the place of the day's first point, 0 to 1.
 */
export function dayTicks(days: readonly string[]): DayTick[] {
  const last = days.length - 1;
  if (last < 1) return [];
  const step = (time(days[last]) - time(days[0])) / DAY <= 77 ? 7 : 14;
  const ticks: DayTick[] = [];
  days.forEach((day, i) => {
    const previous = ticks.at(-1);
    if (previous?.day === day) return;
    if (new Date(time(day)).getUTCDay() !== 1) return;
    if (previous && (time(day) - time(previous.day)) / DAY < step) return;
    ticks.push({ day, at: i / last });
  });
  return ticks;
}
