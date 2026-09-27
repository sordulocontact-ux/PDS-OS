"use server";

import { redirect } from "next/navigation";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import {
  FIRST_CALL_AGENDA,
  firstCallAgendaDurationMinutes,
} from "@/lib/calls/first-call-agenda";
import { canEditProject } from "@/lib/projects/edit-access";
import { getProject } from "@/lib/projects/queries";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";

/**
 * "Préparer un call de cadrage": creates the draft call with the fixed
 * five-topic agenda already attached, then opens its page — the same one
 * used to record it, agenda shown alongside (docs/CONTEXTE-PROJET.md § 6,
 * usage 5 "Préparation de call").
 */
export async function createFirstFramingCall(projectId: string) {
  const access = await requireApproved();
  if (!access.organizationId) return;
  const project = await getProject(projectId);
  if (!project || !canEditProject(access, project)) return;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("calls")
    .insert({
      organization_id: access.organizationId,
      project_id: projectId,
      title: fr.calls.list.firstCallTitle,
      consent: "granted",
      agenda: [...FIRST_CALL_AGENDA],
      duration_minutes: firstCallAgendaDurationMinutes,
    })
    .select("id")
    .single();
  if (error || !data) {
    console.error("[calls] createFirstFramingCall failed:", error?.message);
    return;
  }

  redirect(routes.projectCall(projectId, data.id));
}
