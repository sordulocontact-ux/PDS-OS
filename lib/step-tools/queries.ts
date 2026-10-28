import "server-only";

import { trackedCache } from "@/lib/projects/live-deps";

import { can } from "@/lib/auth/access";
import { getAccess } from "@/lib/auth/dal";
import { personName } from "@/lib/projects/types";
import {
  NOTE_SOURCES,
  NOTE_STATUSES,
  STEP_MODULES,
  type NoteSource,
  type NoteStatus,
  type StepBlocker,
  type StepModule,
  type StepNote,
} from "@/lib/step-tools/model";
import { createClient } from "@/lib/supabase/server";

export type StepTools = {
  blockers: StepBlocker[];
  notes: StepNote[];
  // Open blockers of the Activations, kept in their own table
  // (`activation_blockers`): counted by the chips, shown by the activation.
  activationBlockers: number;
  // Report a blocker, note an information: whoever of PDS sees the
  // launched project. Decide a note: the owner.
  canWrite: boolean;
  canDecide: boolean;
  // The project's owner: decides the notes, unblocks a contradiction.
  ownerName: string;
};

type Name = { first_name: string; last_name: string | null } | null;
const nameOf = (p: Name) => (p ? personName(p.first_name, p.last_name) : "");
const isModule = (v: string): v is StepModule =>
  (STEP_MODULES as readonly string[]).includes(v);

/**
 * Every blocker and noted information of a project, read once per request
 * with the user's session (RLS: whoever sees the project). The step, the
 * chips and the dialog filter it (`sameStep`, `attentionOf`).
 */
export const loadStepTools = trackedCache(
  async (projectId: string): Promise<StepTools> => {
    const supabase = await createClient();
    const access = await getAccess();
    const [blockers, notes, activations, project, writable] = await Promise.all(
      [
        supabase
          .from("step_blockers")
          .select(
            "id, module, step_key, subject_id, description, unblocker_name, unblocker_person_id, next_action, reported_at, lifted_at, lift_note, reporter:people!step_blockers_reported_by_fkey(first_name, last_name), lifter:people!step_blockers_lifted_by_fkey(first_name, last_name)",
          )
          .eq("project_id", projectId)
          .order("reported_at"),
        supabase
          .from("step_notes")
          .select(
            "id, module, step_key, subject_id, body, source, status, contradiction_group, authoritative, noted_at, decided_at, discarded_at, author:people!step_notes_noted_by_fkey(first_name, last_name), decider:people!step_notes_decided_by_fkey(first_name, last_name)",
          )
          .eq("project_id", projectId)
          .order("noted_at"),
        supabase
          .from("activation_blockers")
          .select("id", { count: "exact", head: true })
          .eq("project_id", projectId)
          .eq("status", "open"),
        supabase
          .from("projects")
          .select(
            "owner_person_id, owner:people!projects_owner_person_id_fkey(first_name, last_name)",
          )
          .eq("id", projectId)
          .maybeSingle(),
        supabase.rpc("step_tools_can_write", { p_project_id: projectId }),
      ],
    );
    const failed = blockers.error ?? notes.error ?? writable.error;
    if (failed) console.error("loadStepTools:", failed.message);

    const owner =
      access.personId !== null &&
      project.data?.owner_person_id === access.personId &&
      can(access, "pilot_projects");
    return {
      blockers: (blockers.data ?? []).flatMap((b) =>
        isModule(b.module)
          ? [
              {
                id: b.id,
                module: b.module,
                stepKey: b.step_key,
                subjectId: b.subject_id,
                description: b.description,
                unblocker: b.unblocker_name,
                unblockerPersonId: b.unblocker_person_id,
                nextAction: b.next_action,
                reportedBy: nameOf(b.reporter as Name),
                reportedAt: b.reported_at,
                lifted:
                  b.lifted_at && b.lift_note
                    ? {
                        by: nameOf(b.lifter as Name),
                        at: b.lifted_at,
                        note: b.lift_note,
                      }
                    : null,
                canLift:
                  !b.lifted_at &&
                  (owner ||
                    (access.personId !== null &&
                      b.unblocker_person_id === access.personId)),
              },
            ]
          : [],
      ),
      notes: (notes.data ?? []).flatMap((n) =>
        isModule(n.module) &&
        (NOTE_SOURCES as readonly string[]).includes(n.source) &&
        (NOTE_STATUSES as readonly string[]).includes(n.status)
          ? [
              {
                id: n.id,
                module: n.module,
                stepKey: n.step_key,
                subjectId: n.subject_id,
                body: n.body,
                source: n.source as NoteSource,
                status: n.status as NoteStatus,
                group: n.contradiction_group,
                authoritative: n.authoritative,
                notedBy: nameOf(n.author as Name),
                notedAt: n.noted_at,
                decided: n.decided_at
                  ? { by: nameOf(n.decider as Name), at: n.decided_at }
                  : null,
                discarded: n.discarded_at !== null,
              },
            ]
          : [],
      ),
      activationBlockers: activations.count ?? 0,
      canWrite: writable.data === true,
      canDecide: owner,
      ownerName: nameOf((project.data?.owner ?? null) as Name),
    };
  },
);
