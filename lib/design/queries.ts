import "server-only";

import type { Access } from "@/lib/auth/access";
import { DESIGN_TEXT_FIELDS, toFieldState } from "@/lib/framing/brief";
import type { DesignFieldState } from "@/lib/framing/brief";
import {
  loadMembers,
  loadPendingValidation,
  loadValidators,
  type Member,
  type PendingValidation,
} from "@/lib/framing/related";
import { designStateOf, type DesignState } from "@/lib/design/rules";
import { listDesignVersions, type DesignVersion } from "@/lib/design/versions";
import { createClient } from "@/lib/supabase/server";

/** One line of work of the Dossier: a deliverable, or the creative direction. */
export type DesignTrack = {
  // Null: the creative direction itself (boards, moodboard).
  deliverableId: string | null;
  title: string;
  leverLabel: string | null;
  assigneeName: string | null;
  dueDate: string | null;
  state: DesignState;
  // Newest first.
  versions: DesignVersion[];
  // Mirrors can_deposit_design_version (SQL), which decides anyway.
  canDeposit: boolean;
};

export type DesignData = {
  organizationId: string;
  stage: { id: string; state: string } | null;
  pendingValidation: PendingValidation | null;
  fields: DesignFieldState[];
  direction: DesignTrack;
  deliverables: DesignTrack[];
  // Deliverables per design state, counted by code.
  counts: Record<DesignState, number>;
  // The owner reviews while the Conception is in progress.
  canReview: boolean;
  mePersonId: string | null;
  validators: Member[];
};

/** Everything the Conception page shows, read with the user's session (RLS). */
export async function loadDesign(
  projectId: string,
  access: Access,
): Promise<DesignData | null> {
  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id, organization_id, owner_person_id")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) return null;

  const [
    stageRes,
    fieldsRes,
    deliverablesRes,
    creativesRes,
    versions,
    members,
  ] = await Promise.all([
    supabase
      .from("project_stages")
      .select("id, state, stage_definitions!inner(key)")
      .eq("project_id", projectId)
      .eq("stage_definitions.key", "design")
      .maybeSingle(),
    supabase
      .from("current_field_values")
      .select("*")
      .eq("project_id", projectId)
      .eq("deliverable", "design_doc"),
    supabase
      .from("strategy_deliverables")
      .select("id, title, assignee_person_id, due_date, levers(label)")
      .eq("project_id", projectId)
      .order("created_at"),
    supabase
      .from("project_creatives")
      .select("person_id")
      .eq("project_id", projectId),
    listDesignVersions(supabase, projectId),
    loadMembers(access),
  ]);

  const stage = stageRes.data
    ? { id: stageRes.data.id, state: stageRes.data.state }
    : null;
  const me = access.personId;
  const inProgress = stage?.state === "in_progress";
  const isOwner = me !== null && project.owner_person_id === me;
  const isCreative = (creativesRes.data ?? []).some((c) => c.person_id === me);
  const nameOf = new Map(members.map((m) => [m.personId, m.name]));
  const versionsOf = (deliverableId: string | null) =>
    versions.filter((v) => v.deliverableId === deliverableId);

  const deliverables: DesignTrack[] = (deliverablesRes.data ?? []).map((d) => {
    const own = versionsOf(d.id);
    return {
      deliverableId: d.id,
      title: d.title,
      leverLabel: d.levers?.label ?? null,
      assigneeName: d.assignee_person_id
        ? (nameOf.get(d.assignee_person_id) ?? null)
        : null,
      dueDate: d.due_date,
      state: designStateOf(own[0]),
      versions: own,
      canDeposit:
        inProgress &&
        (isOwner || isCreative || (me !== null && d.assignee_person_id === me)),
    };
  });

  const direction = versionsOf(null);
  const counts: Record<DesignState, number> = {
    to_design: 0,
    submitted: 0,
    changes_requested: 0,
    approved: 0,
  };
  for (const d of deliverables) counts[d.state] += 1;

  const fieldRows = fieldsRes.data ?? [];
  const [pendingValidation, validators] = await Promise.all([
    loadPendingValidation(stage?.id ?? null, members),
    loadValidators(project.organization_id),
  ]);

  return {
    organizationId: project.organization_id,
    stage,
    pendingValidation,
    // Written by hand only: no provenance to show.
    fields: DESIGN_TEXT_FIELDS.map((key) =>
      toFieldState(
        "design_doc",
        key,
        fieldRows.find((r) => r.field_key === key),
        null,
      ),
    ),
    direction: {
      deliverableId: null,
      title: "",
      leverLabel: null,
      assigneeName: null,
      dueDate: null,
      state: designStateOf(direction[0]),
      versions: direction,
      canDeposit: inProgress && (isOwner || isCreative),
    },
    deliverables,
    counts,
    canReview: inProgress && isOwner,
    mePersonId: me,
    validators,
  };
}
