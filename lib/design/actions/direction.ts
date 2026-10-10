"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { designDone, type DesignResult } from "@/lib/design/actions/shared";
import { DIRECTION_KEY } from "@/lib/design/intentions";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";

// The artistic direction's submissions and decisions. The database writes
// the version's content (design_direction_snapshot) and checks who may act:
// the responsible or the owner submits, a named validator decides.

// A section of a submission: the direction, a deliverable or an item of a
// series (uuid), or a Fiche Livrable itself ('sheet', for decisions only).
const section = z.union([z.literal(DIRECTION_KEY), z.uuid()]);
const decidedSection = z.union([section, z.literal("sheet")]);

/** « Soumettre »: the sections the responsible chose, in their order. */
export async function submitDesignDirection(
  projectId: string,
  sections: string[],
): Promise<DesignResult> {
  const parsed = z
    .object({
      projectId: z.uuid(),
      sections: z.array(section).min(1).max(200),
    })
    .safeParse({ projectId, sections });
  if (!parsed.success)
    return { ok: false, error: fr.conceptionDirection.errors.noSection };
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_design_direction", {
    p_project_id: projectId,
    p_sections: [...new Set(parsed.data.sections)],
  });
  return designDone(projectId, error, "submitDesignDirection");
}

const DECISIONS = ["approved", "changes_requested", "rejected"] as const;

/**
 * A validator's decision on one section ('' in global mode: the whole
 * version). A comment is required unless the section is validated.
 */
export async function decideDesignDirection(
  projectId: string,
  submissionId: string,
  sectionKey: string,
  decision: (typeof DECISIONS)[number],
  comment: string,
): Promise<DesignResult> {
  const parsed = z
    .object({
      projectId: z.uuid(),
      submissionId: z.uuid(),
      section: z.union([z.literal(""), decidedSection]),
      decision: z.enum(DECISIONS),
      comment: z.string().trim().max(2000),
    })
    .safeParse({
      projectId,
      submissionId,
      section: sectionKey,
      decision,
      comment,
    });
  if (!parsed.success)
    return { ok: false, error: fr.conception.errors.invalid };
  const p = parsed.data;
  if (p.decision !== "approved" && !p.comment)
    return { ok: false, error: fr.conception.errors.reasonRequired };
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_design_submission", {
    p_submission_id: p.submissionId,
    p_section: p.section,
    p_decision: p.decision,
    p_comment: p.comment || null,
  });
  return designDone(projectId, error, "decideDesignDirection");
}
