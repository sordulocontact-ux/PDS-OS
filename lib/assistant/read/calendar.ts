import "server-only";

import { tool } from "ai";
import { z } from "zod";

import { foldName } from "@/lib/assistant/fuzzy-name";
import {
  capped,
  readFailed,
  type ReadResult,
} from "@/lib/assistant/read/target";
import type { Access } from "@/lib/auth/access";
import { routes } from "@/lib/auth/redirects";
import { sortItems } from "@/lib/calendar/items";
import { loadCalendar } from "@/lib/calendar/queries";
import { assistantReadPilot } from "@/lib/i18n/fr/assistant-read-pilot";
import {
  addDays,
  clock,
  parisPlace,
  periodOf,
  weekStartOf,
} from "@/lib/utils/calendar-period";

const fr = { assistantReadPilot };
const PERIODS = ["this_week", "next_week", "this_month", "next_month"] as const;
type Period = (typeof PERIODS)[number];
const MAX_ITEMS = 40;

const weekdayDay = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const monthYear = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const say = (day: string) => weekdayDay.format(new Date(`${day}T12:00:00Z`));

/** The first and last Paris day of a period, from today as read by code. */
function rangeOf(period: Period, today: string) {
  if (period === "this_week" || period === "next_week") {
    const monday = weekStartOf(
      period === "this_week" ? today : addDays(today, 7),
    );
    return { mode: "week" as const, from: monday, to: addDays(monday, 6) };
  }
  const thisFirst = `${today.slice(0, 7)}-01`;
  const first =
    period === "this_month" ? thisFirst : periodOf("month", thisFirst).next;
  return {
    mode: "month" as const,
    from: first,
    to: addDays(periodOf("month", first).next, -1),
  };
}

export async function readCalendar(
  access: Access,
  period: Period,
  mine: boolean,
  query: string | undefined,
): Promise<ReadResult> {
  const t = fr.assistantReadPilot.calendar;
  // Today is read here, in Paris, never given by the model.
  const range = rangeOf(period, parisPlace(new Date()).day);
  const data = await loadCalendar(periodOf(range.mode, range.from), access);
  const wanted = query ? foldName(query) : "";
  const items = sortItems(
    data.items.filter(
      (i) =>
        i.day >= range.from &&
        i.day <= range.to &&
        (!mine || i.mine) &&
        (!wanted ||
          foldName(`${i.label} ${i.projectTitle ?? ""}`).includes(wanted)),
    ),
  );
  const shown = items.slice(0, MAX_ITEMS);
  const covers =
    range.mode === "week"
      ? t.coversWeek(say(range.from), say(range.to))
      : t.coversMonth(monthYear.format(new Date(`${range.from}T12:00:00Z`)));
  return {
    facts: [
      covers,
      ...(mine ? [t.mineOnly] : []),
      ...(data.error ? [t.error] : []),
      ...(shown.length === 0
        ? [wanted ? t.noMatch(query ?? "") : t.empty]
        : []),
      ...shown.map((i) =>
        t.item(
          say(i.day),
          i.minute === null ? null : clock(i.minute),
          i.label,
          t.kinds[i.kind],
          i.projectTitle,
          `${i.overdue ? t.overdue : ""}${i.mine ? t.mine : ""}`,
        ),
      ),
      ...capped(items.length, MAX_ITEMS),
    ],
    sources: [{ label: "Calendrier", href: routes.calendar }],
  };
}

export function calendarTool(access: Access) {
  return tool({
    description:
      "Lit les dates du Calendrier de l'application sur une période : sorties, calls, tournages, sessions studio, temps forts, étapes avec échéance, tâches, par jour avec leur projet et leur heure. La période est calculée par l'application à partir de la date du jour. À appeler pour « j'ai quoi cette semaine ? », « le call avec X, c'est quand ? ».",
    inputSchema: z.object({
      period: z
        .enum(PERIODS)
        .optional()
        .describe("this_week (par défaut), next_week, this_month, next_month"),
      mine: z
        .boolean()
        .optional()
        .describe(
          "true pour ne garder que ce qui demande un geste à l'utilisateur",
        ),
      query: z
        .string()
        .max(100)
        .optional()
        .describe("Nom d'un call, d'une réunion ou d'un projet à retrouver"),
    }),
    execute: async ({ period, mine, query }) => {
      try {
        return await readCalendar(
          access,
          period ?? "this_week",
          mine ?? false,
          query?.trim() || undefined,
        );
      } catch (error) {
        console.error("readCalendar:", error);
        return readFailed();
      }
    },
  });
}
