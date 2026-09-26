import "server-only";

import { notFound } from "next/navigation";
import { cache } from "react";

import { projectIdSchema } from "@/lib/projects/schemas";
import {
  CREDITS_SELECT,
  toCredits,
  type RawCredit,
} from "@/lib/catalog/queries";
import {
  formatCredits,
  type Credit,
  type MasterOption,
} from "@/lib/catalog/types";
import {
  currentStageOf,
  isAssignmentStatus,
  isPriority,
  isProjectType,
  projectStatusOf,
  type Assignment,
  isStageState,
  personName,
  sortStages,
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

// Masters in link order, each with its credits: the artist of a project is
// the first credit of its first master (same rule as project_artist_name).
const MASTERS_SELECT = `links:project_masters!project_masters_project_same_org(position, master:masters!project_masters_master_same_org(id, title, version, ${CREDITS_SELECT}))`;

type RawLink = {
  position: number;
  master: {
    id: string;
    title: string;
    version: string | null;
    credits: RawCredit[];
  } | null;
};

function toMasters(
  raw: RawLink[],
): Array<MasterOption & { credits: Credit[] }> {
  return [...raw]
    .sort((a, b) => a.position - b.position)
    .flatMap((link) => {
      if (!link.master) return [];
      const credits = toCredits(link.master.credits);
      return [
        {
          id: link.master.id,
          title: link.master.title,
          version: link.master.version,
          artists: formatCredits(credits),
          credits,
        },
      ];
    });
}

const ASSIGNMENTS_SELECT =
  "assignments:project_assignments!project_assignments_project_same_org(id, status, note, response, responded_at, created_at, assignee_person_id, assignee:people!project_assignments_assignee_person_id_fkey(first_name, last_name), assigner:people!project_assignments_assigned_by_fkey(first_name, last_name))";

type RawAssignment = {
  id: string;
  status: string;
  note: string | null;
  response: string | null;
  responded_at: string | null;
  created_at: string;
  assignee_person_id: string;
  assignee: { first_name: string; last_name: string | null } | null;
  assigner: { first_name: string; last_name: string | null } | null;
};

// Newest first.
function toAssignments(raw: RawAssignment[]): Assignment[] {
  return raw
    .flatMap((a): Assignment[] =>
      isAssignmentStatus(a.status)
        ? [
            {
              id: a.id,
              status: a.status,
              assigneePersonId: a.assignee_person_id,
              assigneeName: a.assignee
                ? personName(a.assignee.first_name, a.assignee.last_name)
                : "",
              assignedByName: a.assigner
                ? personName(a.assigner.first_name, a.assigner.last_name)
                : "",
              note: a.note,
              response: a.response,
              respondedAt: a.responded_at,
              createdAt: a.created_at,
            },
          ]
        : [],
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function artistNameOf(
  masters: Array<{ credits: Credit[] }>,
  legacyArtist: { name: string } | null,
): string {
  return masters[0]?.credits[0]?.name ?? legacyArtist?.name ?? "";
}

/** Live projects the viewer sees, newest first; `ids` narrows to those. */
export async function listProjects(filter?: { ids: string[] }): Promise<{
  projects: ProjectListItem[];
  error: boolean;
}> {
  if (filter && filter.ids.length === 0) return { projects: [], error: false };
  const supabase = await createClient();
  let query = supabase
    .from("projects")
    .select(
      `id, title, type, owner_person_id, artist:artists!projects_artist_same_org(name), ${MASTERS_SELECT}, ${STAGES_SELECT}, ${ASSIGNMENTS_SELECT}`,
    )
    .is("archived_at", null);
  if (filter) query = query.in("id", filter.ids);
  const { data, error } = await query.order("created_at", {
    ascending: false,
  });

  if (error) {
    console.error("listProjects:", error.message);
    return { projects: [], error: true };
  }

  const projects = (data ?? []).map((row): ProjectListItem => {
    const stages = toStages(row.project_stages as RawStage[]);
    const masters = toMasters(row.links as RawLink[]);
    const latest = toAssignments(row.assignments as RawAssignment[])[0];
    return {
      id: row.id,
      title: row.title,
      artistName: artistNameOf(masters, row.artist),
      type: isProjectType(row.type) ? row.type : "music_release",
      status: projectStatusOf(stages.length, latest ?? null),
      ownerPersonId: row.owner_person_id,
      latestAssignment: latest
        ? { status: latest.status, assigneePersonId: latest.assigneePersonId }
        : null,
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
        `id, title, type, created_at, due_date, budget_cents, priority, framing_notes, owner_person_id, artist:artists!projects_artist_same_org(name), owner:people!projects_owner_person_id_fkey(first_name, last_name), ${MASTERS_SELECT}, ${STAGES_SELECT}, ${ASSIGNMENTS_SELECT}`,
      )
      .eq("id", projectId)
      .maybeSingle();

    if (error) {
      console.error("getProject:", error.message);
      return null;
    }
    if (!data) return null;

    const stages = toStages(data.project_stages as RawStage[]);
    const masters = toMasters(data.links as RawLink[]);
    const assignments = toAssignments(data.assignments as RawAssignment[]);
    const owner = data.owner
      ? personName(data.owner.first_name, data.owner.last_name)
      : "";
    return {
      id: data.id,
      title: data.title,
      type: isProjectType(data.type) ? data.type : "music_release",
      createdAt: data.created_at,
      artistName: artistNameOf(masters, data.artist),
      ownerName: owner || null,
      ownerPersonId: data.owner_person_id,
      status: projectStatusOf(stages.length, assignments[0] ?? null),
      assignments,
      dueDate: data.due_date,
      budgetCents: data.budget_cents,
      priority: isPriority(data.priority) ? data.priority : null,
      framingNotes: data.framing_notes,
      masters: masters.map(({ id, title, version, artists }) => ({
        id,
        title,
        version,
        artists,
      })),
      stages,
      currentStage: currentStageOf(stages),
    };
  },
);

// Sections that belong to a launched project (framing, calls, release) do not
// exist before launch: a project with no stage answers 404 there.
export async function requireLaunchedProject(projectId: string) {
  const project = await getProject(projectId);
  if (!project || project.stages.length === 0) notFound();
  return project;
}

// Project managers a project can be transmitted to (director only: empty
// for anyone else, decided by the database).
export async function listAssignablePeople(
  organizationId: string,
): Promise<Array<{ personId: string; name: string }>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_assignable_people", {
    p_organization_id: organizationId,
  });
  if (error) {
    console.error("listAssignablePeople:", error.message);
    return [];
  }
  return (data ?? []).map((p) => ({
    personId: p.person_id,
    name: personName(p.first_name, p.last_name),
  }));
}
