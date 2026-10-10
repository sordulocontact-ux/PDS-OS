"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";

export type ReviewResult = { ok: true } | { ok: false; error: string };

const schema = z.object({
  projectId: z.uuid(),
  results: z.string().max(5000),
  worked: z.string().max(5000),
  improve: z.string().max(5000),
});

/** « Enregistrer le bilan », while « Bilan & clôture » runs. */
export async function saveReview(
  input: z.input<typeof schema>,
): Promise<ReviewResult> {
  await requireApproved();
  const e = fr.projectReview.errors;
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: e.generic };
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_project_review", {
    p_project_id: parsed.data.projectId,
    p_results: parsed.data.results,
    p_worked: parsed.data.worked,
    p_improve: parsed.data.improve,
  });
  if (error) {
    if (error.code === "42501") return { ok: false, error: e.forbidden };
    if (error.message.includes("stage_locked"))
      return { ok: false, error: e.locked };
    console.error("saveReview:", error.code, error.message);
    return { ok: false, error: e.generic };
  }
  revalidatePath(routes.project(parsed.data.projectId), "layout");
  return { ok: true };
}
