"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { analyseForFraming } from "@/lib/framing/analyse";
import { loadFramingKnowledge } from "@/lib/framing/knowledge";
import { openFraming } from "@/lib/framing/open";
import { fail, ok, type ActionResult } from "@/lib/framing/result";
import { fr } from "@/lib/i18n/fr";
import { clarificationsOf } from "@/lib/projects/clarifications";
import { canEditProject } from "@/lib/projects/edit-access";
import { getProject } from "@/lib/projects/queries";
import type { ProjectDetail } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

// Marks that PO has read the initial context once (a Brief row of its own,
// outside the six dimensions): the analysis is never paid for twice.
const CONTEXT_ANALYSIS_KEY = "context_analysis";

type Access = Awaited<ReturnType<typeof requireApproved>>;

/**
 * PO reads the initial context and the transmission's answered
 * clarifications once; its proposals land « à confirmer ». False on a
 * provider failure, so it can be tried again.
 */
async function readInitialContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  access: Access,
  project: ProjectDetail,
): Promise<boolean> {
  const knowledge = await loadFramingKnowledge(project.id, access);
  const analysed = knowledge?.framing.briefRows.some(
    (r) => r.field_key === CONTEXT_ANALYSIS_KEY,
  );
  // The transmission's clarifications are read with the initial context
  // (PROJ-UX-02): the director's answer about the budget is proposed in the
  // Cadrage with its provenance, never typed again. Only the answered ones,
  // and only what this person may read (project_assignment_messages).
  const answered = clarificationsOf(project.assignments).filter(
    (c) => c.question && c.answer,
  );
  const context = [
    project.initialContext?.trim(),
    ...answered.map((c) =>
      fr.transmission.clarifications.forPo(
        c.subject
          ? fr.transmission.subjects[c.subject]
          : fr.transmission.subjects.other,
        c.question!,
        c.answer!,
      ),
    ),
  ]
    .filter(Boolean)
    .join("\n\n");
  if (!knowledge || !context || analysed) return true;
  const result = await analyseForFraming(supabase, knowledge, {
    kind: "context",
    text: context,
    label: answered.length
      ? fr.framingIntel.sources.contextAndClarifications
      : undefined,
  });
  // Recorded once read, even with nothing found; not on a provider
  // failure, so it can be tried again.
  if (!result.ok) return false;
  await supabase.from("field_values").insert({
    organization_id: access.organizationId!,
    project_id: project.id,
    deliverable: "brief",
    field_key: CONTEXT_ANALYSIS_KEY,
    value: { proposed: result.proposed },
    status: "confirmed",
    source_type: "manual",
  });
  return true;
}

/**
 * « Commencer le cadrage » (ticket § 1 and § 4): the direct path with PO.
 * Opens the Cadrage without a call, starts its stage, lets PO read the
 * initial context once (its proposals land « à confirmer »), then opens the
 * first question. Owner only; the database checks it again. A failed
 * reading does not hold the Cadrage back: the dimensions offer to try again.
 */
export async function startFramingWithPo(projectId: string) {
  if (!z.uuid().safeParse(projectId).success) return;
  const access = await requireApproved();
  const project = await getProject(projectId);
  if (!project || !access.organizationId || !canEditProject(access, project))
    return;
  const supabase = await createClient();

  if (!(await openFraming(supabase, project))) return;
  await readInitialContext(supabase, access, project);

  // The redirect lands on the same URL: without this, the router serves its
  // cached entry screen (staleTimes) until a reload.
  revalidatePath(routes.project(projectId), "layout");
  redirect(routes.projectFramingStep(projectId, "dimensions"));
}

/** « Relire le contexte »: the reading that failed at the start, again. */
export async function rereadFramingContext(
  projectId: string,
): Promise<ActionResult> {
  if (!z.uuid().safeParse(projectId).success) return fail("invalid_input");
  const access = await requireApproved();
  const project = await getProject(projectId);
  if (!project || !access.organizationId) return fail("not_found");
  if (!canEditProject(access, project)) return fail("forbidden");
  const supabase = await createClient();
  if (!(await readInitialContext(supabase, access, project)))
    return fail("context_unread");
  revalidatePath(routes.project(projectId), "layout");
  return ok;
}
