import "server-only";

import { getServerEnv } from "@/lib/env";
import { IntegrationError } from "@/lib/integrations/http";

/**
 * Single entry point to Google Calendar (CLAUDE.md, rule 2): a new call
 * becomes an event of the organizer's calendar, with a Google Meet link, and
 * Google e-mails the invitation to every participant (sendUpdates=all).
 * Server-side only, with the organizer's OAuth refresh token
 * (GOOGLE_CALENDAR_*), never exposed to the browser. Optional: without it,
 * a call takes a video link pasted by hand (docs/ARCHITECTURE.md § 4 bis).
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API = "https://www.googleapis.com/calendar/v3";

export class GoogleCalendarError extends IntegrationError {
  constructor(reason: string) {
    super("google_calendar", reason);
    this.name = "GoogleCalendarError";
  }
}

type Settings = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  calendarId: string;
};

function settings(): Settings | null {
  const env = getServerEnv();
  if (
    !env.GOOGLE_CALENDAR_CLIENT_ID ||
    !env.GOOGLE_CALENDAR_CLIENT_SECRET ||
    !env.GOOGLE_CALENDAR_REFRESH_TOKEN
  )
    return null;
  return {
    clientId: env.GOOGLE_CALENDAR_CLIENT_ID,
    clientSecret: env.GOOGLE_CALENDAR_CLIENT_SECRET,
    refreshToken: env.GOOGLE_CALENDAR_REFRESH_TOKEN,
    calendarId: env.GOOGLE_CALENDAR_ID ?? "primary",
  };
}

/** Whether a new call can get its Meet link from Google. */
export function googleMeetConfigured(): boolean {
  return settings() !== null;
}

// An access token lasts about an hour: kept by the server instance.
let cached: { token: string; expiresAt: number } | null = null;

async function accessToken(config: Settings): Promise<string> {
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;
  let response: Response;
  try {
    response = await fetch(TOKEN_URL, {
      method: "POST",
      cache: "no-store",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: config.refreshToken,
        grant_type: "refresh_token",
      }),
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw new GoogleCalendarError("unreachable");
  }
  if (!response.ok) throw new GoogleCalendarError(`token_${response.status}`);
  const body = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!body.access_token) throw new GoogleCalendarError("token_missing");
  cached = {
    token: body.access_token,
    expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000,
  };
  return cached.token;
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
  const token = await accessToken(config);
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
