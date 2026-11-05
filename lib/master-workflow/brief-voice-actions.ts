"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import {
  BRIEF_COLUMNS,
  briefFromRow,
  emptyBrief,
  writeBrief,
  type BriefFields,
} from "@/lib/master-workflow/brief-row";
import {
  briefProposalsSchema,
  rateCents,
} from "@/lib/master-workflow/brief-proposals";
import { createClient } from "@/lib/supabase/server";

export type ApplyResult = { ok: true } | { ok: false; error: string };

/**
 * Writes the proposals a person kept (from a dictation or an exchange) into
 * the Brief Mix/Master. Everything is checked again here: the changes'
 * shape, each rate read again from its words (never a number from the
 * client), and by the database the owner, the contacts and the lists.
 */
export async function applyBriefProposals(
  projectId: string,
  proposals: unknown,
): Promise<ApplyResult> {
  const t = fr.masterWorkflow.brief.errors;
  const access = await requireApproved();
  const id = z.uuid().safeParse(projectId);
  const changes = briefProposalsSchema.safeParse(proposals);
  if (!id.success || !changes.success || !access.organizationId)
    return { ok: false, error: t.failed };

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("master_briefs")
    .select(BRIEF_COLUMNS)
    .eq("project_id", id.data)
    .maybeSingle();
  const brief = row ? briefFromRow(row) : emptyBrief(null);

  const fields: BriefFields = {};
  const deliverables = new Set(brief.deliverables);
  for (const change of changes.data) {
    switch (change.kind) {
      case "text":
        fields[
          change.field === "references"
            ? "references_text"
            : change.field === "constraints"
              ? "constraints_text"
              : "direction"
        ] = change.value;
        break;
      case "engineer":
        if (change.role === "mix") fields.mix_contact_id = change.contactId;
        else {
          fields.mastering_contact_id = change.contactId;
          fields.mastering_same_engineer = false;
        }
        break;
      case "same_engineer":
        fields.mastering_same_engineer = change.value;
        if (change.value) fields.mastering_contact_id = null;
        break;
      case "rate": {
        const cents = rateCents(change);
        if (cents === null) break;
        fields[
          change.role === "mix" ? "mix_rate_cents" : "mastering_rate_cents"
        ] = cents;
        break;
      }
      case "deliverable":
        deliverables.add(change.key);
        break;
    }
  }
  if (deliverables.size !== brief.deliverables.length)
    fields.deliverables = [...deliverables];
  // A mastering engineer named while "same engineer" was kept: the named
  // person wins, as the proposal says.
  if (fields.mastering_contact_id) fields.mastering_same_engineer = false;
  // Nothing readable to write (an amount the code cannot read): no-op.
  if (Object.keys(fields).length === 0) return { ok: true };
  // A brief created by this first write starts like the form's: the
  // database gives it the validator chosen at creation, else the owner
  // (default_master_brief_validator).

  const error = await writeBrief(
    supabase,
    access.organizationId,
    id.data,
    fields,
  );
  if (error) {
    console.error("applyBriefProposals:", error.code, error.message);
    return {
      ok: false,
      error: error.code === "42501" ? t.forbidden : t.failed,
    };
  }
  revalidatePath(routes.projectMasterStep(id.data, "brief"));
  return { ok: true };
}
