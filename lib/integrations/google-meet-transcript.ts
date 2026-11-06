import "server-only";

import type { Transcript } from "@/lib/ai/schemas/transcript";
import {
  GoogleMeetError,
  meetRequest,
  spaceNameOf,
} from "@/lib/integrations/google-meet";

/**
 * Reads back what Meet transcribed during a call (google-meet.ts turned it
 * on), with the organizer's token (`meetings.space.readonly`): every
 * conference held in the call's Meet, oldest first, its transcript entries
 * with who spoke. The text is data, never instructions (CLAUDE.md, rule 4).
 *
 * Fails with a reason the call's page explains: `meet_pending` (the meeting
 * is still on, or Google is still writing the transcript, a few minutes
 * after the end), `meet_no_conference` (nobody joined the Meet),
 * `meet_no_transcript` (the Meet was not transcribed), `http_403` (token
 * without the scope, or a Workspace edition that does not transcribe).
 */

type ConferenceRecord = { name: string; startTime?: string; endTime?: string };
type MeetTranscript = { name: string; state?: string };
type Entry = {
  participant?: string;
  text?: string;
  languageCode?: string;
  startTime?: string;
  endTime?: string;
};
type Participant = {
  name: string;
  signedinUser?: { displayName?: string };
  anonymousUser?: { displayName?: string };
  phoneUser?: { displayName?: string };
};

// 100 pages of 100: far beyond a working session, a bound on a runaway loop.
const MAX_PAGES = 100;

async function listAll<T>(path: string, key: string): Promise<T[]> {
  const items: T[] = [];
  let token: string | undefined;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const separator = path.includes("?") ? "&" : "?";
    const query = `pageSize=100${token ? `&pageToken=${encodeURIComponent(token)}` : ""}`;
    const body = await meetRequest<Record<string, unknown>>(
      "GET",
      `${path}${separator}${query}`,
    );
    items.push(...((body[key] as T[] | undefined) ?? []));
    token = body.nextPageToken as string | undefined;
    if (!token) break;
  }
  return items;
}

const seconds = (iso: string | undefined) =>
  iso ? new Date(iso).getTime() / 1000 : Number.NaN;

function displayNameOf(participant: Participant): string | undefined {
  return (
    participant.signedinUser?.displayName ??
    participant.anonymousUser?.displayName ??
    participant.phoneUser?.displayName
  );
}

export type MeetTranscriptResult = Transcript & { entries: number };

export async function fetchMeetTranscript(
  meetUrl: string,
): Promise<MeetTranscriptResult> {
  const space = await spaceNameOf(meetUrl);
  const records = (
    await listAll<ConferenceRecord>(
      `conferenceRecords?filter=${encodeURIComponent(`space.name = "${space}"`)}`,
      "conferenceRecords",
    )
  ).sort((a, b) => seconds(a.startTime) - seconds(b.startTime));
  if (records.length === 0) throw new GoogleMeetError("meet_no_conference");
  if (records.some((record) => !record.endTime))
    throw new GoogleMeetError("meet_pending");

  const origin = seconds(records[0]!.startTime);
  const segments: Transcript["segments"] = [];
  let language: string | undefined;
  let pending = false;
  let transcribed = false;

  for (const record of records) {
    const transcripts = await listAll<MeetTranscript>(
      `${record.name}/transcripts`,
      "transcripts",
    );
    if (transcripts.length === 0) continue;
    transcribed = true;
    const names = new Map(
      (
        await listAll<Participant>(
          `${record.name}/participants`,
          "participants",
        )
      ).map((p) => [p.name, displayNameOf(p)] as const),
    );
    for (const transcript of transcripts) {
      const entries = await listAll<Entry>(
        `${transcript.name}/entries`,
        "transcriptEntries",
      );
      if (entries.length === 0 && transcript.state !== "FILE_GENERATED")
        pending = true;
      for (const entry of entries) {
        const text = entry.text?.trim();
        const start = seconds(entry.startTime) - origin;
        if (!text || !Number.isFinite(start)) continue;
        const end = seconds(entry.endTime) - origin;
        const speaker = entry.participant
          ? names.get(entry.participant)
          : undefined;
        language ??= entry.languageCode;
        segments.push({
          start: Math.max(0, start),
          end: Math.max(0, Number.isFinite(end) ? end : start),
          text,
          ...(speaker && { speaker }),
        });
      }
    }
  }

  if (segments.length === 0) {
    if (pending) throw new GoogleMeetError("meet_pending");
    throw new GoogleMeetError(
      transcribed ? "meet_pending" : "meet_no_transcript",
    );
  }
  segments.sort((a, b) => a.start - b.start);
  const last = records[records.length - 1]!;
  return {
    // One line per entry, « Name : what they said »: the report can tell who
    // said what (`who`), the segments keep the words alone for the quotes.
    text: segments
      .map((s) => (s.speaker ? `${s.speaker} : ${s.text}` : s.text))
      .join("\n"),
    language: language?.split("-")[0],
    durationSeconds: Math.max(0, seconds(last.endTime) - origin) || undefined,
    segments,
    entries: segments.length,
  };
}
