"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { analyseForFraming } from "@/lib/framing/analyse";
import { loadFramingKnowledge } from "@/lib/framing/knowledge";
import { openFraming } from "@/lib/framing/open";
import { fr } from "@/lib/i18n/fr";
import { clarificationsOf } from "@/lib/projects/clarifications";
import { canEditProject } from "@/lib/projects/edit-access";
import { getProject } from "@/lib/projects/queries";
import { createClient } from "@/lib/supabase/server";

// Marks that PO has read the initial context once (a Brief row of its own,
// outside the six dimensions): the analysis is never paid for twice.
const CONTEXT_ANALYSIS_KEY = "context_analysis";

/**
 * « Commencer le cadrage » (ticket § 1 and § 4): the direct path with PO.
 * Opens the Cadrage without a call, starts its stage, lets PO read the
 * initial context once (its proposals land « à confirmer »), then opens the
 * first question. Owner only; the database checks it again.
 */
export async function startFramingWithPo(projectId: string) {
  if (!z.uuid().safeParse(projectId).success) return;
  const access = await requireApproved();
  const project = await getProject(projectId);
  if (!project || !access.organizationId || !canEditProject(access, project))
    return;
  const supabase = await createClient();

  if (!(await openFraming(supabase, project))) return;

  const knowledge = await loadFramingKnowledge(projectId, access);
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
  if (knowledge && context && !analysed) {
    const result = await analyseForFraming(supabase, knowledge, {
      kind: "context",
      text: context,
      label: answered.length
        ? fr.framingIntel.sources.contextAndClarifications
        : undefined,
    });
    // Recorded once read, even with nothing found; not on a provider
    // failure, so the next start tries again.
    if (result.ok)
      await supabase.from("field_values").insert({
        organization_id: access.organizationId,
        project_id: projectId,
        deliverable: "brief",
        field_key: CONTEXT_ANALYSIS_KEY,
        value: { proposed: result.proposed },
        status: "confirmed",
        source_type: "manual",
      });
  }

  // The redirect lands on the same URL: without this, the router serves its
  // cached entry screen (staleTimes) until a reload.
  revalidatePath(routes.project(projectId), "layout");
  redirect(routes.projectFraming(projectId));
}
