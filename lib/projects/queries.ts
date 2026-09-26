import "server-only";

import { cache } from "react";

import { projectIdSchema } from "@/lib/projects/schemas";
import {
  currentStageOf,
  isReleaseType,
  isStageState,
  personName,
  sortStages,
  type ArtistOption,
  type OwnerOption,
  type ProjectDetail,
  type ProjectListItem,
  type ProjectStage,
} from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

// Every query runs with the user's session: RLS decides what is visible.

const STAGES_SELECT =
  "project_stages(id, state, state_changed_at, definition:stage_definitions!project_stages_stage_definition_id_fkey(key, label, position, archived_at))";

type RawStage = {
  id: string;
  state: string;
  state_changed_at: string | null;
  definition: {
    key: string;
    label: string;
    position: number;
    archived_at: string | null;
  } | null;
};

function toStages(raw: RawStage[]): ProjectStage[] {
  const stages: ProjectStage[] = [];
  for (const row of raw) {
    // Archived definitions are no longer part of the lifecycle.
    if (!row.definition || row.definition.archived_at) continue;
    if (!isStageState(row.state)) continue;
    stages.push({
      id: row.id,
      key: row.definition.key,
      label: row.definition.label,
      position: row.definition.position,
      state: row.state,
      stateChangedAt: row.state_changed_at,
    });
  }
  return sortStages(stages);
}

export async function listProjects(): Promise<{
  projects: ProjectListItem[];
  error: boolean;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select(
      `id, title, release_type, artist:artists!projects_artist_same_org(name), ${STAGES_SELECT}`,
    )
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("listProjects:", error.message);
    return { projects: [], error: true };
  }

  const projects = (data ?? []).map((row): ProjectListItem => {
    const stages = toStages(row.project_stages as RawStage[]);
    return {
      id: row.id,
      title: row.title,
      artistName: row.artist?.name ?? "",
      releaseType: isReleaseType(row.release_type)
        ? row.release_type
        : "single",
      currentStage: currentStageOf(stages),
      stageCount: stages.length,
    };
  });
  return { projects, error: false };
}

// Cached per request: the project layout and its pages share one query.
export const getProject = cache(
  async (projectId: string): Promise<ProjectDetail | null> => {
    if (!projectIdSchema.safeParse(projectId).success) return null;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("projects")
      .select(
        `id, title, release_type, created_at, artist:artists!projects_artist_same_org(name), owner:people!projects_owner_person_id_fkey(first_name, last_name), ${STAGES_SELECT}`,
      )
      .eq("id", projectId)
      .maybeSingle();

    if (error) {
      console.error("getProject:", error.message);
      return null;
    }
    if (!data) return null;

    const stages = toStages(data.project_stages as RawStage[]);
    const owner = data.owner
      ? personName(data.owner.first_name, data.owner.last_name)
      : "";
    return {
      id: data.id,
      title: data.title,
      releaseType: isReleaseType(data.release_type)
        ? data.release_type
        : "single",
      createdAt: data.created_at,
      artistName: data.artist?.name ?? "",
      ownerName: owner || null,
      stages,
      currentStage: currentStageOf(stages),
    };
  },
);

export async function listArtists(): Promise<ArtistOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("artists")
    .select("id, name")
    .is("archived_at", null)
    .order("name");
  if (error) {
    console.error("listArtists:", error.message);
    return [];
  }
  return data ?? [];
}

// Approved members who may own a project. RLS on people returns oneself plus
// approved members (and, for admins, everyone with a membership). Admins also
// see every membership, so the status filter is applied to what is visible;
// a person whose membership is hidden is visible only because approved.
export async function listOwnerCandidates(): Promise<OwnerOption[]> {
  const supabase = await createClient();
  const [people, memberships] = await Promise.all([
    supabase
      .from("people")
      .select("id, first_name, last_name")
      .order("first_name"),
    supabase.from("memberships").select("person_id, status"),
  ]);
  if (people.error || memberships.error) {
    console.error(
      "listOwnerCandidates:",
      people.error?.message ?? memberships.error?.message,
    );
    return [];
  }

  const statusByPerson = new Map<string, string>();
  for (const m of memberships.data ?? []) {
    statusByPerson.set(m.person_id, m.status);
  }

  return (people.data ?? [])
    .filter((p) => (statusByPerson.get(p.id) ?? "approved") === "approved")
    .map((p) => ({
      personId: p.id,
      name: personName(p.first_name, p.last_name) || p.id,
    }));
}
