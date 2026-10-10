import "server-only";

import { resolveSaidDate, type SaidDate } from "@/lib/assistant/said-date";
import type { Verbatim } from "@/lib/assistant/verbatim";
import { fr } from "@/lib/i18n/fr";
import { todayInParis } from "@/lib/insights/dates";

const longDay = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** "2026-10-16" → « vendredi 16 octobre 2026 », written by code. */
export function formatSaidDay(iso: string): string {
  return longDay.format(new Date(`${iso}T00:00:00Z`));
}

/** What the card shows: the date the code understood, and the user's own
 * words when they were relative (« vendredi 16 octobre 2026 · dit
 * « vendredi » »), so a wrong reading is seen before saving. */
export function understood(said: SaidDate & { quote: string }): string {
  const day = formatSaidDay(said.date);
  const full = said.time ? `${day} à ${said.time}` : day;
  return fr.assistant.drafts.understoodDate(full, said.quote);
}

/**
 * A date field of a PO draft: the user's words, checked word for word, then
 * resolved against today by code (lib/assistant/said-date.ts). Anything
 * else leaves the field empty with a warning written by code: never a date
 * the user did not say (UX test of 09/10/2026).
 */
export function readSaidDate(
  verbatim: Verbatim,
  raw: string | undefined,
  label: string,
  warnings: string[],
): (SaidDate & { quote: string }) | null {
  if (!raw) return null;
  const t = fr.assistant.drafts;
  const quote = verbatim.quote(raw);
  if (!quote) {
    warnings.push(t.notSaid(label));
    return null;
  }
  const result = resolveSaidDate(quote, todayInParis());
  if (result.ok) return { date: result.date, time: result.time, quote };
  warnings.push(
    result.error === "vague"
      ? t.dateVague(label, quote)
      : result.error === "weekday_mismatch"
        ? t.dateMismatch(label, quote)
        : t.dateUnparsed(label, quote),
  );
  return null;
}
