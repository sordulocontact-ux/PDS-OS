"use server";

import { redirect } from "next/navigation";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { createClient } from "@/lib/supabase/server";

/**
 * "Commencer en amont": the project has had no call, but the framing opens
 * anyway for manual entry. A rejected, empty Brief field is enough to satisfy
 * framing_is_open (it only checks that a brief field_values row exists), but
 * the restrictive field_values_framing_open policy checks framing_is_open()
 * on every insert — including this first one meant to satisfy it. The
 * security definer RPC breaks that circularity and checks is_project_owner()
 * itself (supabase/migrations/20260927001301_call_agenda.sql).
 */
export async function startFramingWithoutCall(projectId: string) {
  const access = await requireApproved();
  if (!access.organizationId) return;
  const supabase = await createClient();

  const { error } = await supabase.rpc("start_framing_without_call", {
    p_project_id: projectId,
  });
  if (error) {
    console.error("[framing] startFramingWithoutCall failed:", error.message);
    return;
  }

  redirect(routes.projectFraming(projectId));
}
