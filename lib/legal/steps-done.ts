import "server-only";

import { loadIntake } from "@/lib/legal/intake/queries";
import type { LegalStepKey } from "@/lib/ui/legal-steps";
import { createClient } from "@/lib/supabase/server";

/** The Juridique steps really done, computed by the code for the checks of
 * the steps: the Cadrage once every question has an answer (or none is
 * asked), the Confirmation
 * while the dossier stays confirmed (a correction reopens it), the Plan once
 * launched. The État des lieux and the Suivi are never "done": one is read,
 * the other followed until the release. Read with the viewer's session (RLS:
 * manage_legal only). */
export async function loadLegalStepsDone(project: {
  id: string;
  masters: Array<{ id: string; title: string }>;
}): Promise<LegalStepKey[]> {
  const supabase = await createClient();
  const [intake, intakeRow, plan] = await Promise.all([
    loadIntake(project),
    supabase
      .from("legal_intakes")
      .select("status")
      .eq("project_id", project.id)
      .maybeSingle(),
    supabase
      .from("legal_plans")
      .select("launched_at")
      .eq("project_id", project.id)
      .maybeSingle(),
  ]);
  if (intakeRow.error)
    console.error("loadLegalStepsDone intake:", intakeRow.error.message);
  if (plan.error) console.error("loadLegalStepsDone plan:", plan.error.message);

  const done: LegalStepKey[] = [];
  // Nothing to ask counts as done: the Confirmation is the next step.
  if (intake.questions.every((question) => question.answered))
    done.push("framing");
  if (intakeRow.data?.status === "confirmed") done.push("confirmation");
  if (plan.data?.launched_at) done.push("plan");
  return done;
}
