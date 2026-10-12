import "server-only";

import {
  DEFAULT_DELIVERABLES,
  briefDeliverablesOf,
  type MasterBrief,
} from "@/lib/master-workflow/brief-types";
import type { Database } from "@/lib/supabase/database.types";
import type { createClient } from "@/lib/supabase/server";

// A master_briefs row, read and written the same way by the page, the
// dictation and its application. Writes go through the user's session: RLS
// lets only the project's owner write.

type Supabase = Awaited<ReturnType<typeof createClient>>;
type Row = Database["public"]["Tables"]["master_briefs"]["Row"];
export type BriefFields = Omit<
  Database["public"]["Tables"]["master_briefs"]["Update"],
  | "id"
  | "organization_id"
  | "project_id"
  | "created_at"
  | "created_by"
  | "updated_at"
  | "updated_by"
>;

export const BRIEF_COLUMNS =
  "mix_contact_id, mastering_same_engineer, mastering_contact_id, mix_rate_cents, mastering_rate_cents, revisions, validator_person_id, references_text, direction, constraints_text, deliverables, mix_v1_due, mix_final_due, mastering_due, master_final_due, delivery_formats, engineer_message";

type BriefRow = Pick<
  Row,
  | "mix_contact_id"
  | "mastering_same_engineer"
  | "mastering_contact_id"
  | "mix_rate_cents"
  | "mastering_rate_cents"
  | "revisions"
  | "validator_person_id"
  | "references_text"
  | "direction"
  | "constraints_text"
  | "deliverables"
  | "mix_v1_due"
  | "mix_final_due"
  | "mastering_due"
  | "master_final_due"
  | "delivery_formats"
  | "engineer_message"
>;

export function briefFromRow(row: BriefRow): MasterBrief {
  return {
    mixContactId: row.mix_contact_id,
    masteringSameEngineer: row.mastering_same_engineer,
    masteringContactId: row.mastering_contact_id,
    mixRateCents: row.mix_rate_cents,
    masteringRateCents: row.mastering_rate_cents,
    revisions: row.revisions,
    validatorPersonId: row.validator_person_id,
    references: row.references_text,
    direction: row.direction,
    constraints: row.constraints_text,
    deliverables: briefDeliverablesOf(row.deliverables),
    formats: row.delivery_formats,
    message: row.engineer_message,
    dates: {
      mixV1Due: row.mix_v1_due,
      mixFinalDue: row.mix_final_due,
      masteringDue: row.mastering_due,
      masterFinalDue: row.master_final_due,
    },
  };
}

/** A brief never saved: nothing chosen, the two masters as deliverables. */
export function emptyBrief(validatorPersonId: string | null): MasterBrief {
  return {
    mixContactId: null,
    masteringSameEngineer: false,
    masteringContactId: null,
    mixRateCents: null,
    masteringRateCents: null,
    revisions: null,
    validatorPersonId,
    references: null,
    direction: null,
    constraints: null,
    deliverables: DEFAULT_DELIVERABLES,
    formats: null,
    message: null,
    dates: {
      mixV1Due: null,
      mixFinalDue: null,
      masteringDue: null,
      masterFinalDue: null,
    },
  };
}

/**
 * Update, else create: an upsert would rewrite the project and the
 * organization too, columns nobody may update (grants column by column).
 */
export async function writeBrief(
  supabase: Supabase,
  organizationId: string,
  projectId: string,
  fields: BriefFields,
): Promise<{ code?: string; message: string } | null> {
  const updated = await supabase
    .from("master_briefs")
    .update(fields)
    .eq("project_id", projectId)
    .select("id");
  if (updated.error) return updated.error;
  if (updated.data.length > 0) return null;
  const { error } = await supabase.from("master_briefs").insert({
    ...fields,
    organization_id: organizationId,
    project_id: projectId,
  });
  return error;
}
