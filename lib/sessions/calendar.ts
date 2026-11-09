import "server-only";

import { siteUrl } from "@/lib/auth/site-url";
import { routes } from "@/lib/auth/redirects";
import { eventGuestsOf } from "@/lib/calls/schedule";
import { masterPage } from "@/lib/i18n/fr/master-page";
import { sessions } from "@/lib/i18n/fr/sessions";
import { todayInParis } from "@/lib/insights/dates";
import {
  cancelMeetEvent,
  createCalendarEvent,
  googleMeetConfigured,
  updateCalendarEvent,
  type CalendarEvent,
  type CalendarSlot,
} from "@/lib/integrations/google-calendar";
import { getStudioSession } from "@/lib/sessions/queries";
import type { StudioSession } from "@/lib/sessions/types";
import { createClient } from "@/lib/supabase/server";
import { addDays, parisInstant } from "@/lib/utils/calendar-period";

const fr = { masterPage, sessions };

const t = fr.sessions.calendar;

// A session with a start and no end takes this long in the agenda.
const DEFAULT_MINUTES = 120;

const minutesOf = (hm: string) => {
  const [h, m] = hm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

/** Its hours, else the whole day. */
function slotOf(session: StudioSession): CalendarSlot | null {
  if (!session.date) return null;
  if (!session.startsAt)
    return { day: session.date, nextDay: addDays(session.date, 1) };
  const from = minutesOf(session.startsAt);
  const to = session.endsAt ? minutesOf(session.endsAt) : 0;
  return {
    start: parisInstant(session.date, from),
    end: parisInstant(session.date, to > from ? to : from + DEFAULT_MINUTES),
  };
}

/** The internal team invited (Ibé, 05/11/2026): the members taking part and
 * whoever writes the report; never the Réseau's contacts. */
function teamOf(session: StudioSession): string[] {
  const ids = new Set(
    session.attendees.flatMap((a) =>
      a.key.startsWith("m:") ? [a.key.slice(2)] : [],
    ),
  );
  if (session.responsible) ids.add(session.responsible.personId);
  return [...ids];
}

/**
 * Keeps a studio session's event of the label's Google Agenda in step with
 * it (retour d'Ibé du 01/11/2026): created when it is dated (today or
 * later), rewritten when it changes, cancelled when it is cancelled or
 * loses its date. Google refusing never fails the save: it is logged, and
 * the next save tries again. Without the Google connection, nothing.
 */
export async function syncSessionCalendar(sessionId: string): Promise<void> {
  if (!googleMeetConfigured()) return;
  try {
    const supabase = await createClient();
    const [session, { data: row }] = await Promise.all([
      getStudioSession(sessionId),
      supabase
        .from("master_sessions")
        .select("google_event_id")
        .eq("id", sessionId)
        .maybeSingle(),
    ]);
    if (!session) return;
    const eventId = row?.google_event_id ?? null;
    const slot = session.state === "cancelled" ? null : slotOf(session);
    if (!slot) {
      if (eventId) await dropEvent(sessionId, eventId);
      return;
    }
    // A session told after it happened is not sent as an invitation.
    if (!eventId && session.date && session.date < todayInParis()) return;
    const event: CalendarEvent = {
      title: t.title(
        fr.masterPage.sessions.kinds[session.kind],
        session.artists.map((a) => a.name).join(", "),
      ),
      description: t.description(`${siteUrl()}${routes.session(session.id)}`),
      location: session.studio,
      slot,
      guests: await eventGuestsOf(supabase, teamOf(session), []),
    };
    if (eventId) {
      await updateCalendarEvent(eventId, event);
      return;
    }
    const created = await createCalendarEvent(event);
    const { error } = await supabase
      .from("master_sessions")
      .update({ google_event_id: created })
      .eq("id", sessionId);
    if (error) console.error("[sessions] calendar id:", error.message);
  } catch (error) {
    console.error("[sessions] google calendar failed:", error);
  }
}

async function dropEvent(sessionId: string, eventId: string): Promise<void> {
  await cancelMeetEvent(eventId);
  const supabase = await createClient();
  const { error } = await supabase
    .from("master_sessions")
    .update({ google_event_id: null })
    .eq("id", sessionId);
  if (error) console.error("[sessions] calendar id:", error.message);
}

/** A deleted session: its event is cancelled (read before the delete). */
export async function cancelSessionEvent(eventId: string | null) {
  if (!eventId || !googleMeetConfigured()) return;
  try {
    await cancelMeetEvent(eventId);
  } catch (error) {
    console.error("[sessions] google calendar cancel failed:", error);
  }
}
