"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { designDone } from "@/lib/design/actions/shared";
import { DESIGN_TOPICS, DIRECTION_KEY } from "@/lib/design/intentions";
import { fr } from "@/lib/i18n/fr";
import { withOutcome } from "@/lib/journey/outcome";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

const t = fr.designSteps.direction;

/**
 * « Soumettre à … » of the Direction artistique (proto dirsubmit): the
 * points nobody said are written here first (a confirmed intention of the
 * direction, « Saisi par … »), then the direction and the chosen sections
 * are submitted to the validators of the direction, in one version.
 */
export async function submitDirectionStep(input: {
  projectId: string;
  sections: string[];
  written: Partial<Record<(typeof DESIGN_TOPICS)[number], string>>;
}): Promise<WriteResult> {
  const parsed = z
    .object({
      projectId: z.uuid(),
      sections: z.array(z.uuid()).max(200),
      written: z.partialRecord(
        z.enum(DESIGN_TOPICS),
        z.string().trim().max(2000),
      ),
    })
    .safeParse(input);
  if (!parsed.success)
    return { ok: false, error: fr.conception.errors.invalid };
  const p = parsed.data;
  await requireApproved();
  return withOutcome(p.projectId, ["marketing"], t.submittedDone, async () => {
    const supabase = await createClient();
    for (const [topic, value] of Object.entries(p.written)) {
      if (!value) continue;
      const { error } = await supabase.rpc("save_design_intention", {
        p_project_id: p.projectId,
        p_deliverable_id: null,
        p_topic: topic,
        p_value: value,
        p_choices: { choices: [], other: null },
      });
      if (error) return designDone(p.projectId, error, "direction write");
    }
    const { error } = await supabase.rpc("submit_design_direction", {
      p_project_id: p.projectId,
      p_sections: [DIRECTION_KEY, ...new Set(p.sections)],
    });
    return designDone(p.projectId, error, "submitDirectionStep");
  });
}
