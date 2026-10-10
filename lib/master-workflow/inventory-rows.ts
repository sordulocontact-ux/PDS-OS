import "server-only";

import { audioStateOf } from "@/lib/catalog/title-rules";
import type {
  FlowCredit,
  FramingEngineer,
} from "@/lib/master-workflow/engineer-facts";
import type {
  FlowContact,
  FlowLinkedCredit,
} from "@/lib/master-workflow/network-engineers";
import type { FlowAudio, FlowSource } from "@/lib/master-workflow/audio-source";
import type {
  FlowSession,
  FlowTitle,
} from "@/lib/master-workflow/source-facts";
import {
  contactsOf,
  creditsByTitle,
  currentSources,
  filesByTitle,
  framingEngineersOf,
  linkedCreditsOf,
  sessionsByTitle,
} from "@/lib/master-workflow/inventory-mappers";
import {
  ENGINEER_ROLES,
  type EngineerRole,
  type MasterSectionKey,
} from "@/lib/master-workflow/types";
import { createClient } from "@/lib/supabase/server";

// Every row of the État du master in one round of parallel queries, with the
// viewer's session: RLS decides what appears. No N+1: the rows of all the
// project's titles come in one query per table.

// The Réseau is the team's directory, and the credits linked to its
// engineers a few per title: far below these for 3 to 5 people.
const NETWORK_LIMIT = 2000;
const LINKED_CREDITS_LIMIT = 5000;
const FILES_LIMIT = 2000;

export type MasterRows = {
  // In the project's order.
  titles: FlowTitle[];
  audioOf: Map<string, FlowAudio[]>;
  // Number of stems files (latest version of each series), per title.
  stemsOf: Map<string, number>;
  // Newest first.
  sessionsOf: Map<string, FlowSession[]>;
  creditsOf: Map<string, FlowCredit[]>;
  // The source confirmed last for each title (earlier ones are history).
  sourceOf: Map<string, FlowSource>;
  // Who mixes and who masters as the Cadrage confirmed them (a contact of
  // the Réseau): offered to credit when a title has nobody.
  framingEngineers: Map<EngineerRole, FramingEngineer>;
  contacts: FlowContact[];
  linkedCredits: FlowLinkedCredit[];
  failed: Partial<Record<MasterSectionKey | "network", boolean>>;
};

function failed(scope: string, error: { message: string } | null): boolean {
  if (error) console.error(`readMasterRows ${scope}:`, error.message);
  return error !== null;
}

export async function readMasterRows(
  projectId: string,
  // The project's titles in its order, with their credited artists.
  projectMasters: Array<{ id: string; title: string; artists: string }>,
): Promise<MasterRows> {
  const supabase = await createClient();
  const masterIds = projectMasters.map((master) => master.id);
  const titled = masterIds.length > 0;
  const none = Promise.resolve({ data: [], error: null });

  const [masters, files, sessions, credits, contacts, linked, sources, team] =
    await Promise.all([
      titled
        ? supabase.from("masters").select("id, audio_state").in("id", masterIds)
        : none,
      titled
        ? supabase
            .from("master_files")
            .select(
              "master_id, series_id, category, file_name, audio_state, version, created_at, id",
            )
            .in("master_id", masterIds)
            .in("category", ["audio", "stems"])
            .order("created_at", { ascending: false })
            .limit(FILES_LIMIT)
        : none,
      titled
        ? supabase
            .from("master_sessions")
            .select(
              "id, master_id, kind, session_date, studio, engineer, notes, created_at",
            )
            .in("master_id", masterIds)
            .order("session_date", { ascending: false, nullsFirst: false })
            .order("created_at", { ascending: false })
        : none,
      titled
        ? supabase
            .from("master_contributors")
            .select("id, master_id, name, role, detail, contact_id")
            .in("master_id", masterIds)
            .in("role", [...ENGINEER_ROLES])
            .order("created_at")
        : none,
      supabase
        .from("network_contacts")
        .select("id, name, roles, email, phone, city, parent_id")
        .is("archived_at", null)
        .order("name")
        .limit(NETWORK_LIMIT),
      supabase
        .from("master_contributors")
        .select("master_id, role, contact_id")
        .in("role", [...ENGINEER_ROLES])
        .not("contact_id", "is", null)
        .limit(LINKED_CREDITS_LIMIT),
      titled
        ? supabase
            .from("master_flow_sources")
            .select(
              "master_id, file_id, created_at, confirmer:people!master_flow_sources_created_by_fkey(first_name, last_name)",
            )
            .eq("project_id", projectId)
            .order("created_at", { ascending: false })
        : none,
      supabase
        .from("project_team_members")
        .select("role_key, contact_id, display_name")
        .eq("project_id", projectId)
        .eq("review_status", "confirmed")
        .in("role_key", [...ENGINEER_ROLES])
        .not("contact_id", "is", null)
        .order("created_at"),
    ]);

  const stateOf = new Map(
    (masters.data ?? []).map((row) => [row.id, audioStateOf(row.audio_state)]),
  );

  const network = contactsOf(contacts.data ?? []);

  return {
    titles: projectMasters.map((master, position) => ({
      ...master,
      position,
      audioState: stateOf.get(master.id) ?? null,
    })),
    ...filesByTitle(files.data ?? []),
    sessionsOf: sessionsByTitle(sessions.data ?? []),
    creditsOf: creditsByTitle(credits.data ?? []),
    sourceOf: currentSources(sources.data ?? []),
    framingEngineers: framingEngineersOf(team.data ?? [], network),
    contacts: network,
    linkedCredits: linkedCreditsOf(linked.data ?? []),
    failed: {
      sources:
        failed("masters", masters.error) ||
        failed("confirmed sources", sources.error) ||
        failed("files", files.error) ||
        failed("sessions", sessions.error),
      materials: failed("files", files.error),
      engineers:
        failed("credits", credits.error) ||
        failed("sessions", sessions.error) ||
        failed("network", contacts.error) ||
        failed("framing team", team.error),
      network:
        failed("network", contacts.error) ||
        failed("linked credits", linked.error),
    },
  };
}
