import "server-only";

import { trackedCache } from "@/lib/projects/live-deps";

import { createClient } from "@/lib/supabase/server";

// Rows of the Master that several loaders of one render read (the journey's
// facts, the Mix and Mastering steps, the versions, the Master final, the
// brief): one request per project and render instead of one per loader
// (page loads audit, docs/ARCHITECTURE.md § 3 bis). Each read is the union
// of the columns its callers ask for, with the same project filter and
// order; callers filter on stage, role or decision in memory and never
// change what they get (it is shared). Under RLS like every read; a Server
// Action reads afresh (`cache` only memoizes while rendering).

/** The project's brief for the engineers (one per project), or null. */
export const masterBriefRow = trackedCache(async (projectId: string) => {
  const supabase = await createClient();
  return supabase
    .from("master_briefs")
    .select(
      "created_at, updated_at, recorded_at, content_changed_at, changed_by, start_mode, direction, references_text, constraints_text, validator_person_id, mix_contact_id, mix_person_id, mastering_same_engineer, mastering_contact_id, mastering_person_id, mix_rate_cents, mastering_rate_cents, revisions, deliverables, mix_v1_due, mix_final_due, mastering_due, master_final_due, delivery_formats, engineer_message, mix_assigned_at, mastering_assigned_at, validator:people!master_briefs_validator_person_id_fkey(first_name, last_name), updater:people!master_briefs_updated_by_fkey(first_name, last_name), recorder:people!master_briefs_recorded_by_fkey(first_name, last_name), mix:network_contacts!master_briefs_mix_contact_same_org(name), mastering:network_contacts!master_briefs_mastering_contact_same_org(name), mixer:people!master_briefs_mix_person_id_fkey(first_name, last_name), masterer:people!master_briefs_mastering_person_id_fkey(first_name, last_name)",
    )
    .eq("project_id", projectId)
    .maybeSingle();
});

/** Every version of the project's mix and mastering rounds, newest number
 * first (one approved version at most per title and stage:
 * master_mix_versions_final_key). */
export const masterVersionRows = trackedCache(async (projectId: string) => {
  const supabase = await createClient();
  return supabase
    .from("master_mix_versions")
    .select(
      "id, master_id, stage, number, status, created_at, feedback_summary, feedback_sent_at, decision, decision_note, decided_at, reopened_at, reopen_reason, source_file_id, file:master_files!master_mix_versions_file_id_fkey(id, file_name, path, audio_state, version, created_at), author:people!master_mix_versions_created_by_fkey(first_name, last_name), decider:people!master_mix_versions_decided_by_fkey(first_name, last_name)",
    )
    .eq("project_id", projectId)
    .order("number", { ascending: false });
});

/** Every sending of the project's packages to an engineer, newest first. */
export const masterTransmissionRows = trackedCache(
  async (projectId: string) => {
    const supabase = await createClient();
    return supabase
      .from("master_transmissions")
      .select(
        "id, role, contact_id, created_at, note, link_sent_at, opened_at, acknowledged_at, delivered_at, revoked_at, revoke_reason, expires_at, derogations, continues_id, contact:network_contacts!master_transmissions_contact_same_org(name), sender:people!master_transmissions_created_by_fkey(first_name, last_name)",
      )
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
  },
);

/** The rows of a shared read that pass `keep`, in the same order, with the
 * same error: what the same read filtered in SQL returns. */
export function whereRows<R, E>(
  read: Promise<{ data: R[] | null; error: E }>,
  keep: (row: R) => boolean,
): Promise<{ data: R[] | null; error: E }> {
  return read.then(({ data, error }) => ({
    data: data ? data.filter(keep) : null,
    error,
  }));
}
