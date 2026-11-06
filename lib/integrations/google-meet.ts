import "server-only";

import {
  googleAccessToken,
  googleSettings,
} from "@/lib/integrations/google-oauth";
import { IntegrationError } from "@/lib/integrations/http";

/**
 * Single entry point to the Google Meet REST API (CLAUDE.md, rule 2), with the
 * organizer's account (google-oauth.ts). A call's Meet is made by Calendar
 * (google-calendar.ts) in po@'s name, so po@ is its organizer and may set it
 * up: Meet then transcribes it by itself as soon as someone allowed to
 * transcribe joins (docs/ARCHITECTURE.md § 4 bis).
 *
 * Needs the `meetings.space.settings` scope in the token and a Workspace
 * edition that transcribes (Business Standard or above): without them Google
 * answers 403 and the call keeps its Meet link, only without the transcript.
 */

const API = "https://meet.googleapis.com/v2";

export class GoogleMeetError extends IntegrationError {
  constructor(reason: string) {
    super("google_meet", reason);
    this.name = "GoogleMeetError";
  }
}

/** The meeting code of a Meet link (`https://meet.google.com/abc-defg-hij`). */
export function meetingCodeOf(meetUrl: string): string | null {
  const match =
    /^https:\/\/meet\.google\.com\/([a-z]{3}-[a-z]{4}-[a-z]{3})\b/i.exec(
      meetUrl,
    );
  return match ? match[1].toLowerCase() : null;
}

/** One call to the Meet API with the organizer's token (google-oauth.ts). */
export async function meetRequest<T>(
  method: "GET" | "PATCH",
  path: string,
  body?: unknown,
): Promise<T> {
  const config = googleSettings();
  if (!config) throw new GoogleMeetError("not_configured");
  const token = await googleAccessToken(config);
  let response: Response;
  try {
    response = await fetch(`${API}/${path}`, {
      method,
      cache: "no-store",
      headers: {
        authorization: `Bearer ${token}`,
        ...(body !== undefined && { "content-type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw new GoogleMeetError("unreachable");
  }
  if (!response.ok) throw new GoogleMeetError(`http_${response.status}`);
  return (await response.json()) as T;
}

/** The lasting name (`spaces/…`) of the Meet of this link, found by its code. */
export async function spaceNameOf(meetUrl: string): Promise<string> {
  const code = meetingCodeOf(meetUrl);
  if (!code) throw new GoogleMeetError("not_a_meet_link");
  const space = await meetRequest<{ name?: string }>("GET", `spaces/${code}`);
  if (!space.name?.startsWith("spaces/"))
    throw new GoogleMeetError("space_missing");
  return space.name;
}

/**
 * Turns on Meet's automatic transcription for the meeting of this link. The
 * space is found by its meeting code, then patched by its lasting name
 * (`spaces/…`), the only name `patch` accepts.
 */
export async function turnOnAutoTranscription(meetUrl: string): Promise<void> {
  const space = await spaceNameOf(meetUrl);
  await meetRequest(
    "PATCH",
    `${space}?updateMask=config.artifactConfig.transcriptionConfig.autoTranscriptionGeneration`,
    {
      config: {
        artifactConfig: {
          transcriptionConfig: { autoTranscriptionGeneration: "ON" },
        },
      },
    },
  );
}
