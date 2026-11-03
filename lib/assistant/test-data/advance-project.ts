import "server-only";

import { after } from "next/server";

import { fillFraming } from "@/lib/assistant/test-data/fill-framing";
import {
  logged,
  type Person,
  type Supabase,
} from "@/lib/assistant/test-data/writes";
import type { Access } from "@/lib/auth/access";
import { sendFramingBrief } from "@/lib/framing/actions/brief-versions";
import { keepSentBriefPdf } from "@/lib/framing/brief-pdf-file";
import { fr } from "@/lib/i18n/fr";
import { schedulePendingPushes } from "@/lib/notifications/push";
import { launchPlan } from "@/lib/plan/actions";
import { getProject } from "@/lib/projects/queries";

export const TEST_PROJECT_STAGES = ["framing", "launched"] as const;
export type TestProjectStage = (typeof TEST_PROJECT_STAGES)[number];

/**
 * Takes a test project just made by create_test_data past its Cadrage
 * (docs/ASSISTANT.md § 3 ter): « crée un faux projet, remplis le Cadrage,
 * je veux être aux étapes ». The same gestures as the screens, with the
 * user's session, so RLS and every SQL check apply: accept the project,
 * fill the Cadrage (fill_page_test_data's code), then for « launched » send
 * the Brief, validate it (only when the user is its validator) and launch
 * the plan as proposed. Stops at the first gesture refused and says which.
 */
export async function advanceTestProject(
  supabase: Supabase,
  access: Access,
  project: { id: string; manager: Person },
  upTo: TestProjectStage,
): Promise<string[]> {
  const t = fr.assistant.testData.advance;
  const projectId = project.id;
  if (project.manager.personId !== access.personId)
    return [t.notYours(project.manager.name)];

  // Read from the table, not getProject: the project read once per request
  // must come after the acceptance, which creates its stages and owner.
  const { data: assignment } = await supabase
    .from("project_assignments")
    .select("id, status")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!assignment) return [t.failed(t.steps.accept)];
  if (assignment.status === "pending") {
    const accepted = await supabase.rpc("respond_to_assignment", {
      p_assignment_id: assignment.id,
      p_decision: "accepted",
    });
    if (!logged(accepted, "accept project")) return [t.failed(t.steps.accept)];
  }
  const detail = await getProject(projectId);
  if (!detail) return [t.failed(t.steps.accept)];
  const facts: string[] = [t.accepted];

  if ((await fillFraming(supabase, access, detail)) === false)
    return [...facts, t.failed(t.steps.framing)];
  facts.push(t.framingFilled);
  if (upTo === "framing") return [...facts, t.stopsAtFraming];

  const sent = await sendFramingBrief(projectId);
  if (!sent.ok)
    return [
      ...facts,
      t.failed(t.steps.send, fr.framing.errors[sent.error] ?? ""),
    ];
  facts.push(t.briefSent);

  const { data: brief } = await supabase
    .from("framing_briefs")
    .select("validation_id")
    .eq("project_id", projectId)
    .not("validation_id", "is", null)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const validationId = brief?.validation_id ?? null;
  const { data: validation } = validationId
    ? await supabase
        .from("validations")
        .select("validator_person_id")
        .eq("id", validationId)
        .maybeSingle()
    : { data: null };
  // The direction's decision stays the validator's: anyone else stops here.
  if (!validationId || validation?.validator_person_id !== access.personId)
    return [...facts, t.waitsForValidator];

  const decided = await supabase.rpc("decide_framing_brief", {
    p_validation_id: validationId,
    p_approve: true,
  });
  if (!logged(decided, "validate brief"))
    return [...facts, t.failed(t.steps.validate)];
  // « Validée » is printed on the PDF: the validated one is kept too.
  after(() => keepSentBriefPdf({ validationId }));
  await schedulePendingPushes();
  facts.push(t.briefValidated);

  const launched = await launchPlan(projectId, []);
  if (!launched.ok)
    return [
      ...facts,
      t.failed(t.steps.launch, fr.framing.errors[launched.error] ?? ""),
    ];
  return [...facts, t.planLaunched];
}
