"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { deliveryFailure } from "@/lib/production/delivery/result";
import { prepDone, type PrepResult } from "@/lib/production/prep-result";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  projectId: z.uuid(),
  lineId: z.uuid(),
  points: z
    .array(
      z.object({
        key: z.string().min(1).max(40),
        result: z.enum(["ok", "not_ok"]),
        note: z.string().trim().max(500),
      }),
    )
    .min(1)
    .max(20),
});

/**
 * « Enregistrer le contrôle » (PROD-037): the points of one file. The
 * database checks the keys against the file's kind, stamps who and when,
 * and sets the line: conforming only when every point is, not conforming
 * (the failing points as its note) as soon as one is not.
 */
export async function checkExportPoints(
  input: z.input<typeof schema>,
): Promise<PrepResult> {
  await requireApproved();
  const parsed = schema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: fr.productionPrep.errors.invalid };
  const { projectId, lineId, points } = parsed.data;
  if (points.some((p) => p.result === "not_ok" && p.note === ""))
    return { ok: false, error: fr.productionClosure.points.noteRequired };
  const supabase = await createClient();
  const { error } = await supabase.rpc("check_production_export", {
    p_line_id: lineId,
    p_points: points.map((p) => ({
      key: p.key,
      result: p.result,
      note: p.result === "ok" ? null : p.note,
    })),
  });
  return error ? deliveryFailure(error) : prepDone(projectId);
}
