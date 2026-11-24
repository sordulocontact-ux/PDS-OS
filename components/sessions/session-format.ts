import { masterPage } from "@/lib/i18n/fr/master-page";
import { sessions } from "@/lib/i18n/fr/sessions";
import type { StudioSessionRow } from "@/lib/sessions/types";

// How a studio session reads in a list, its page and its side sheet.
// Client-safe.

const fr = { masterPage, sessions };

/** « Enregistrement · Studio Ferber », the name of a session in a list. */
export function sessionName(
  session: Pick<StudioSessionRow, "kind" | "studio">,
): string {
  return [fr.masterPage.sessions.kinds[session.kind], session.studio]
    .filter(Boolean)
    .join(" · ");
}

const minutesOf = (hm: string) =>
  Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3, 5));

/** « 4 h 18 » when both hours are known, else nothing. */
export function sessionDuration(
  session: Pick<StudioSessionRow, "startsAt" | "endsAt">,
): string | null {
  if (!session.startsAt || !session.endsAt) return null;
  const minutes = minutesOf(session.endsAt) - minutesOf(session.startsAt);
  return minutes > 0 ? fr.sessions.duration(minutes) : null;
}

/** « 14:00 – 18:00 », or nothing. */
export function sessionHours(
  session: Pick<StudioSessionRow, "startsAt" | "endsAt">,
): string | null {
  return session.startsAt || session.endsAt
    ? fr.sessions.page.hours(session.startsAt, session.endsAt)
    : null;
}
