import "server-only";

import {
  googleAccessToken,
  googleSettings,
  type GoogleSettings,
} from "@/lib/integrations/google-oauth";
import { IntegrationError } from "@/lib/integrations/http";

/**
 * Single entry point to Google Calendar (CLAUDE.md, rule 2): a new call
 * becomes an event of the organizer's calendar, with a Google Meet link, and
 * Google e-mails the invitation to every participant (sendUpdates=all).
 * Server-side only, with the organizer's OAuth refresh token
 * (GOOGLE_CALENDAR_*, google-oauth.ts), never exposed to the browser. Optional: without it,
 * a call takes a video link pasted by hand (docs/ARCHITECTURE.md § 4 bis).
 */

const API = "https://www.googleapis.com/calendar/v3";

export class GoogleCalendarError extends IntegrationError {
  constructor(reason: string) {
    super("google_calendar", reason);
    this.name = "GoogleCalendarError";
  }
}

type Settings = GoogleSettings;

function settings(): Settings | null {
  return googleSettings();
}

/** Whether a new call can get its Meet link from Google. */
export function googleMeetConfigured(): boolean {
  return settings() !== null;
}

type EventBody = {
  id?: string;
  hangoutLink?: string;
  conferenceData?: {
    createRequest?: { status?: { statusCode?: string } };
    entryPoints?: Array<{ entryPointType?: string; uri?: string }>;
  };
};

async function request(
  config: Settings,
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<EventBody> {
  const token = await googleAccessToken(config);
  let response: Response;
  try {
    response = await fetch(`${API}${path}`, {
      method,
      cache: "no-store",
      headers: {
        authorization: `Bearer ${token}`,
        ...(body !== undefined && { "content-type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new GoogleCalendarError("unreachable");
  }
  if (!response.ok) throw new GoogleCalendarError(`http_${response.status}`);
  // A deleted event answers with no body.
  if (response.status === 204) return {} as EventBody;
  return (await response.json()) as EventBody;
}

function meetLinkOf(event: EventBody): string | null {
  const video = event.conferenceData?.entryPoints?.find(
    (entry) => entry.entryPointType === "video",
  )?.uri;
  const link = event.hangoutLink ?? video ?? null;
  return link && /^https:\/\/\S+$/.test(link) ? link : null;
}

export type MeetEvent = { eventId: string; meetUrl: string };

/**
 * Creates the event with its Meet link and invites the guests by e-mail.
 * `requestId` makes a retry of the same call ask for the same conference.
 * Google may prepare the conference in the background: the event is read
 * again a few times until the link is there.
 */
export async function createMeetEvent(input: {
  requestId: string;
  title: string;
  description: string;
  start: Date;
  end: Date;
  guests: Array<{ email: string; name?: string | null }>;
}): Promise<MeetEvent> {
  const config = settings();
  if (!config) throw new GoogleCalendarError("not_configured");
  const calendar = encodeURIComponent(config.calendarId);
  const created = await request(
    config,
    "POST",
    `/calendars/${calendar}/events?conferenceDataVersion=1&sendUpdates=all`,
    {
      summary: input.title,
      description: input.description,
      start: { dateTime: input.start.toISOString(), timeZone: "Europe/Paris" },
      end: { dateTime: input.end.toISOString(), timeZone: "Europe/Paris" },
      attendees: input.guests.map((guest) => ({
        email: guest.email,
        ...(guest.name && { displayName: guest.name }),
      })),
      conferenceData: {
        createRequest: {
          requestId: input.requestId,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    },
  );
  if (!created.id) throw new GoogleCalendarError("event_missing");

  let event = created;
  for (let attempt = 0; attempt < 3 && !meetLinkOf(event); attempt += 1) {
    if (event.conferenceData?.createRequest?.status?.statusCode === "failure")
      break;
    await new Promise((resolve) => setTimeout(resolve, 700));
    event = await request(
      config,
      "GET",
      `/calendars/${calendar}/events/${encodeURIComponent(created.id)}`,
    );
  }
  const meetUrl = meetLinkOf(event);
  if (!meetUrl) throw new GoogleCalendarError("meet_missing");
  return { eventId: created.id, meetUrl };
}

/** Moves the event to a new slot; Google tells every guest (sendUpdates). */
export async function moveMeetEvent(input: {
  eventId: string;
  start: Date;
  end: Date;
}): Promise<void> {
  const config = settings();
  if (!config) throw new GoogleCalendarError("not_configured");
  await request(
    config,
    "PATCH",
    `/calendars/${encodeURIComponent(config.calendarId)}/events/${encodeURIComponent(input.eventId)}?sendUpdates=all`,
    {
      start: { dateTime: input.start.toISOString(), timeZone: "Europe/Paris" },
      end: { dateTime: input.end.toISOString(), timeZone: "Europe/Paris" },
    },
  );
}

/** Replaces the event's guests; Google invites the new ones and tells the
 * ones taken off (sendUpdates). */
export async function setMeetEventGuests(input: {
  eventId: string;
  guests: Array<{ email: string; name?: string | null }>;
}): Promise<void> {
  const config = settings();
  if (!config) throw new GoogleCalendarError("not_configured");
  await request(
    config,
    "PATCH",
    `/calendars/${encodeURIComponent(config.calendarId)}/events/${encodeURIComponent(input.eventId)}?sendUpdates=all`,
    {
      attendees: input.guests.map((guest) => ({
        email: guest.email,
        ...(guest.name && { displayName: guest.name }),
      })),
    },
  );
}

/** Cancels the event; Google tells every guest (sendUpdates). Already gone
 * (410) counts as cancelled. */
export async function cancelMeetEvent(eventId: string): Promise<void> {
  const config = settings();
  if (!config) throw new GoogleCalendarError("not_configured");
  try {
    await request(
      config,
      "DELETE",
      `/calendars/${encodeURIComponent(config.calendarId)}/events/${encodeURIComponent(eventId)}?sendUpdates=all`,
    );
  } catch (error) {
    if (error instanceof GoogleCalendarError && error.reason === "http_410")
      return;
    throw error;
  }
}
