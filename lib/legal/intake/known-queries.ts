import "server-only";

import {
  knownPeopleOf,
  type KnownPerson,
} from "@/lib/legal/intake/known-people";
import { createClient } from "@/lib/supabase/server";

// Read with the viewer's session: the Cadrage juridique (questions) and the
// save of an answer (the credit linked to its contact) see the same people.

const ENGINEERS = ["mix_engineer", "mastering_engineer"] as const;
const isEngineer = (
  value: string | null,
): value is (typeof ENGINEERS)[number] =>
  (ENGINEERS as readonly string[]).includes(value ?? "");

function failed(scope: string, error: { message: string } | null) {
  if (error) console.error(`loadKnownPeople ${scope}:`, error.message);
}

export async function loadKnownPeople(
  projectId: string,
  masterIds: string[],
): Promise<Map<string, KnownPerson[]>> {
  if (masterIds.length === 0) return new Map();
  const supabase = await createClient();
  const [artists, team, sessions] = await Promise.all([
    supabase
      .from("master_artists")
      .select(
        "master_id, position, role, artist:artists!master_artists_artist_same_org(name)",
      )
      .in("master_id", masterIds)
      .order("position"),
    supabase
      .from("project_team_members")
      .select(
        "role_key, display_name, contact_id, contact:network_contacts!team_contact_same_org(name)",
      )
      .eq("project_id", projectId)
      .eq("review_status", "confirmed")
      .in("role_key", [...ENGINEERS])
      .not("contact_id", "is", null)
      .order("created_at"),
    supabase
      .from("master_sessions")
      .select("master_id, kind, engineer")
      .in("master_id", masterIds)
      .not("engineer", "is", null)
      .order("created_at"),
  ]);
  failed("artists", artists.error);
  failed("team", team.error);
  failed("sessions", sessions.error);

  return knownPeopleOf(masterIds, {
    artists: (artists.data ?? []).flatMap((row) =>
      row.artist
        ? [
            {
              masterId: row.master_id,
              name: row.artist.name,
              featuring: row.role === "featuring",
            },
          ]
        : [],
    ),
    team: (team.data ?? []).flatMap((row) =>
      isEngineer(row.role_key) && row.contact_id
        ? [
            {
              role: row.role_key,
              name: row.contact?.name ?? row.display_name,
              contactId: row.contact_id,
            },
          ]
        : [],
    ),
    sessions: (sessions.data ?? []).flatMap((row) =>
      row.master_id === null
        ? []
        : [{ masterId: row.master_id, kind: row.kind, engineer: row.engineer }],
    ),
  });
}
