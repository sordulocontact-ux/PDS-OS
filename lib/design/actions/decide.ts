"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { designDone } from "@/lib/design/actions/shared";
import { fr } from "@/lib/i18n/fr";
import { withOutcome } from "@/lib/journey/outcome";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

// The direction's decision on what was submitted (proto dirdecide /
// fdecide): Valider / Demander des modifications / Refuser, one decision on
// the whole version. A version sent before, one decision per section
// (« per_section »), gets the same decision on each of its sections.

const DECISIONS = {
  approve: "approved",
  request_changes: "changes_requested",
  refuse: "rejected",
} as const;

export async function decideDesignStep(input: {
  projectId: string;
  submissionId: string;
  kind: keyof typeof DECISIONS;
  comment: string;
  done: string;
}): Promise<WriteResult> {
  const parsed = z
    .object({
      projectId: z.uuid(),
      submissionId: z.uuid(),
      kind: z.enum(["approve", "request_changes", "refuse"]),
      comment: z.string().trim().max(2000),
      done: z.string().max(300),
    })
    .safeParse(input);
  if (!parsed.success)
    return { ok: false, error: fr.conception.errors.invalid };
  const p = parsed.data;
  await requireApproved();
  return withOutcome(p.projectId, ["marketing"], p.done, async () => {
    const supabase = await createClient();
    const { data: submission } = await supabase
      .from("design_submissions")
      .select("mode, sections, design_decisions(section)")
      .eq("id", p.submissionId)
      .eq("project_id", p.projectId)
      .maybeSingle();
    if (!submission) return { ok: false, error: fr.conception.errors.generic };
    const decided = new Set(submission.design_decisions.map((d) => d.section));
    const sections =
      submission.mode === "global"
        ? [""]
        : submission.sections.filter((s) => !decided.has(s));
    for (const section of sections) {
      const { error } = await supabase.rpc("decide_design_submission", {
        p_submission_id: p.submissionId,
        p_section: section,
        p_decision: DECISIONS[p.kind],
        p_comment: p.comment,
      });
      if (error) return designDone(p.projectId, error, "decideDesignStep");
    }
    return designDone(p.projectId, null, "decideDesignStep");
  });
}
