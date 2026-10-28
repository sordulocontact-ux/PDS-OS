import "server-only";

import { asCallStatus, type CallStatus } from "@/lib/calls/constants";
import type { PrepPerson } from "@/lib/calls/prep/types";
import type { SavedTake } from "@/lib/calls/recording";
import { loadCallRecording } from "@/lib/calls/recording-queries";
import { fr } from "@/lib/i18n/fr";
import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

/** A prepared call before it is held, as the step shows it. */
export type PlannedCall = {
  callId: string;
  projectId: string | null;
  occurredAt: string;
  createdAt: string;
  createdBy: string | null;
  meetingUrl: string | null;
  people: PrepPerson[];
  // Each point, with what PO suggests asking there (an aide-mémoire for the
  // call, Sacha 28/10/2026).
  agenda: PlannedPoint[];
  // Held: recorded or processed (its report then takes over).
  held: boolean;
};

export type PlannedPoint = { topic: string; questions: string[] };

const pointsOf = (agenda: unknown): PlannedPoint[] =>
  Array.isArray(agenda)
    ? agenda.flatMap((item) =>
        item &&
        typeof item === "object" &&
        "topic" in item &&
        typeof item.topic === "string"
          ? [
              {
                topic: item.topic,
                questions:
                  "questions" in item && Array.isArray(item.questions)
                    ? item.questions.filter(
                        (q: unknown): q is string => typeof q === "string",
                      )
                    : [],
              },
            ]
          : [],
      )
    : [];

/**
 * A call as « Échange prévu » reads it: when, who created it, its link, its
 * participants (the creator, the team invited, the guests) and its agenda.
 * Read with the user's session (RLS: whoever sees the call).
 */
export async function loadPlannedCall(
  callId: string,
): Promise<PlannedCall | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("calls")
    .select(
      "id, project_id, occurred_at, created_at, meeting_url, agenda, status, audio_path, creator:people!calls_created_by_fkey(id, first_name, last_name), call_attendees(person_id, person:people!call_attendees_person_id_fkey(first_name, last_name)), call_guests(email, name, contact_id)",
    )
    .eq("id", callId)
    .maybeSingle();
  if (error) console.error("[calls] planned call:", error.message);
  if (!data) return null;
  const t = fr.callPrep;
  const creator = data.creator
    ? personName(data.creator.first_name, data.creator.last_name)
    : null;
  const people: PrepPerson[] = [
    ...(data.creator
      ? [
          {
            key: `m:${data.creator.id}`,
            name: creator ?? "",
            detail: t.roles.owner,
            external: false,
            invite: "app" as const,
            email: null,
          },
        ]
      : []),
    ...data.call_attendees
      .filter((a) => a.person_id !== data.creator?.id)
      .map((a) => ({
        key: `m:${a.person_id}`,
        name: a.person
          ? personName(a.person.first_name, a.person.last_name)
          : "",
        detail: t.roles.team,
        external: false,
        invite: "app" as const,
        email: null,
      })),
    ...data.call_guests.map((g) => ({
      key: g.contact_id ? `c:${g.contact_id}` : `e:${g.email}`,
      name: g.name ?? g.email,
      detail: t.how.email,
      external: true,
      invite: "email" as const,
      email: g.email,
    })),
  ];
  return {
    callId: data.id,
    projectId: data.project_id,
    occurredAt: data.occurred_at,
    createdAt: data.created_at,
    createdBy: creator,
    meetingUrl: data.meeting_url,
    people,
    agenda: pointsOf(data.agenda),
    held: Boolean(data.audio_path) || data.status !== "draft",
  };
}

/** What a step's card needs to record the call and process it in place. */
export type CallInPlace = {
  organizationId: string;
  status: CallStatus;
  errorCode: string | null;
  hasTranscript: boolean;
  // Saved while recording and not sent yet: a reload finds them again.
  takes: SavedTake[];
};

/**
 * The call's recording and processing state, for a step that records it
 * without opening the call's page (Cadrage, Sacha 28/10/2026). Read with
 * the user's session (RLS).
 */
export async function loadCallInPlace(
  callId: string,
): Promise<CallInPlace | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("calls")
    .select("organization_id, status, error_code, audio_path, transcripts(id)")
    .eq("id", callId)
    .maybeSingle();
  if (error) console.error("[calls] call in place:", error.message);
  if (!data) return null;
  const recording = await loadCallRecording(supabase, callId, data.audio_path);
  return {
    organizationId: data.organization_id,
    status: asCallStatus(data.status),
    errorCode: data.error_code,
    hasTranscript: data.transcripts.length > 0,
    takes: recording.takes,
  };
}
