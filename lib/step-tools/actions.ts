"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getAccess, requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { loadMembers } from "@/lib/framing/related";
import { fr } from "@/lib/i18n/fr";
import { rankedNetwork } from "@/lib/network/ranked-people";
import { schedulePendingPushes } from "@/lib/notifications/push";
import {
  NOTE_SOURCES,
  NOTE_STATUSES,
  STEP_MODULES,
} from "@/lib/step-tools/model";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

const e = fr.stepTools.errors;

// Database refusals (supabase/migrations/20261018400201) → their sentence.
const MESSAGES: Array<[string, string]> = [
  ["forbidden", e.forbidden],
  ["unblocker_", e.unblocker],
  ["blocker_lifted", e.lifted],
  ["lift_note_required", e.liftNote],
  ["note_discarded", e.noteGone],
  ["note_unknown", e.noteGone],
  ["note_not_open", e.noteNotOpen],
  ["note_not_contradicted", e.noteNotOpen],
  ["invalid_input", e.invalid],
];

async function settle(
  projectId: string,
  error: { code?: string; message?: string } | null,
): Promise<WriteResult> {
  if (error) {
    const message = error.message ?? "";
    console.error("step-tools:", error.code, message);
    for (const [code, sentence] of MESSAGES)
      if (message.includes(code)) return { ok: false, error: sentence };
    if (error.code === "42501") return { ok: false, error: e.forbidden };
    return { ok: false, error: e.failed };
  }
  revalidatePath(routes.project(projectId), "layout");
  await schedulePendingPushes();
  return { ok: true };
}

const ref = {
  projectId: z.uuid(),
  module: z.enum(STEP_MODULES),
  stepKey: z.string().regex(/^[a-z0-9][a-z0-9_:-]{0,79}$/),
  subjectId: z.uuid().nullable().optional(),
};

const blockerSchema = z.object({
  ...ref,
  description: z.string().trim().min(1).max(1000),
  // « m:<person> » a member, « c:<contact> » a contact of the Réseau,
  // « » a name only.
  unblockerRef: z.union([
    z.literal(""),
    z.string().regex(/^[mc]:[0-9a-f-]{36}$/),
  ]),
  unblockerName: z.string().trim().max(200),
  nextAction: z.string().trim().min(1).max(500),
});

/** « Signaler » : what blocks, who unblocks, the next action. */
export async function reportStepBlocker(
  input: z.input<typeof blockerSchema>,
): Promise<WriteResult> {
  await requireApproved();
  const parsed = blockerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: e.invalid };
  const v = parsed.data;
  const [kind, id] = v.unblockerRef ? v.unblockerRef.split(":") : ["", ""];
  if (!id && !v.unblockerName) return { ok: false, error: e.unblocker };
  const supabase = await createClient();
  const { error } = await supabase.rpc("report_step_blocker", {
    p_project_id: v.projectId,
    p_module: v.module,
    p_step_key: v.stepKey,
    p_subject_id: v.subjectId ?? null,
    p_description: v.description,
    p_unblocker_person_id: kind === "m" ? id : null,
    p_unblocker_contact_id: kind === "c" ? id : null,
    p_unblocker_name: v.unblockerName || null,
    p_next_action: v.nextAction,
  });
  return settle(v.projectId, error);
}

/** « Lever le blocage », with what solved it (kept in the history). */
export async function liftStepBlocker(input: {
  projectId: string;
  blockerId: string;
  note: string;
}): Promise<WriteResult> {
  await requireApproved();
  const parsed = z
    .object({
      projectId: z.uuid(),
      blockerId: z.uuid(),
      note: z.string().trim().min(1).max(1000),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: e.liftNote };
  const supabase = await createClient();
  const { error } = await supabase.rpc("lift_step_blocker", {
    p_blocker_id: parsed.data.blockerId,
    p_note: parsed.data.note,
  });
  return settle(parsed.data.projectId, error);
}

const noteSchema = z.object({
  ...ref,
  body: z.string().trim().min(1).max(1000),
  source: z.enum(NOTE_SOURCES),
  status: z.enum(NOTE_STATUSES),
  contradictsId: z.union([z.uuid(), z.literal("")]),
});

/** « Noter » : what was said, its source and status, what it contradicts. */
export async function noteStepInformation(
  input: z.input<typeof noteSchema>,
): Promise<WriteResult> {
  await requireApproved();
  const parsed = noteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: e.invalid };
  const v = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("note_step_information", {
    p_project_id: v.projectId,
    p_module: v.module,
    p_step_key: v.stepKey,
    p_subject_id: v.subjectId ?? null,
    p_body: v.body,
    p_source: v.source,
    p_status: v.status,
    p_contradicts_id: v.contradictsId || null,
  });
  return settle(v.projectId, error);
}

/** The owner's decision on a note: decided, discarded, or authoritative. */
export async function decideStepNote(input: {
  projectId: string;
  noteId: string;
  decision: "decide" | "discard" | "authoritative";
}): Promise<WriteResult> {
  await requireApproved();
  const parsed = z
    .object({
      projectId: z.uuid(),
      noteId: z.uuid(),
      decision: z.enum(["decide", "discard", "authoritative"]),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: e.invalid };
  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_step_note", {
    p_note_id: parsed.data.noteId,
    p_decision: parsed.data.decision,
  });
  return settle(parsed.data.projectId, error);
}

export type UnblockerOption = {
  id: string;
  label: string;
  detail?: string;
  // The project's own people (members, its team's contacts): listed first.
  project: boolean;
};

/** « Qui débloque » : the members of PDS, the project team's contacts,
 * then the rest of the Réseau. Read with the user's session. */
export async function loadUnblockerOptions(
  projectId: string,
): Promise<UnblockerOption[]> {
  await requireApproved();
  if (!z.uuid().safeParse(projectId).success) return [];
  const supabase = await createClient();
  const [members, team] = await Promise.all([
    loadMembers(await getAccess()),
    supabase
      .from("project_team_members")
      .select("contact_id, role")
      .eq("project_id", projectId)
      .neq("review_status", "rejected")
      .not("contact_id", "is", null),
  ]);
  const first = new Map(
    (team.data ?? []).flatMap((m) =>
      m.contact_id ? [[m.contact_id, m.role ?? ""] as const] : [],
    ),
  );
  const network = await rankedNetwork(supabase, [], first);
  return [
    ...members.map((m) => ({
      id: `m:${m.personId}`,
      label: m.name,
      detail: fr.app.name,
      project: true,
    })),
    ...network.map((c) => ({
      id: `c:${c.id}`,
      label: c.label,
      detail: c.detail || undefined,
      project: c.group === "first",
    })),
  ];
}
