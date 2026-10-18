import "server-only";

import type { PrepPerson } from "@/lib/calls/prep/types";
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
  agenda: string[];
  // Held: recorded or processed (its report then takes over).
  held: boolean;
};

const topicsOf = (agenda: unknown): string[] =>
  Array.isArray(agenda)
    ? agenda.flatMap((item) =>
        item &&
        typeof item === "object" &&
        "topic" in item &&
        typeof item.topic === "string"
          ? [item.topic]
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
    agenda: topicsOf(data.agenda),
    held: Boolean(data.audio_path) || data.status !== "draft",
  };
}
