import "server-only";

import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { legalJourneyContext } from "@/lib/legal/journey-context";
import type { LegalReadiness } from "@/lib/legal/readiness/controls";
import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

export type LegalReadinessView =
  // The Juridique's whole computation (manage_legal), the same the
  // « Prêt pour la sortie » step shows; null before the plan is launched.
  | { allowed: true; readiness: LegalReadiness | null }
  // Without manage_legal: only whether the direction validated the release.
  | {
      allowed: false;
      validated: { by: string; at: string } | null;
    };

/**
 * « Prêt pour la sortie » for another module (the Distribution, the
 * overview): ONE computation, lib/legal/readiness/controls.ts, read here
 * (docs/ARCHITECTURE.md § 8 sexies, « Prêt pour la sortie »). Never
 * recompute it elsewhere.
 */
export async function loadLegalReadiness(
  projectId: string,
): Promise<LegalReadinessView> {
  const access = await requireApproved();
  if (can(access, "manage_legal")) {
    const { readiness } = await legalJourneyContext(projectId);
    return { allowed: true, readiness };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("release_validations")
    .select("validated_at, validated_by")
    .eq("project_id", projectId)
    .maybeSingle();
  if (error) console.error("loadLegalReadiness:", error.message);
  if (!data) return { allowed: false, validated: null };
  const { data: person } = await supabase
    .from("people")
    .select("first_name, last_name")
    .eq("id", data.validated_by)
    .maybeSingle();
  return {
    allowed: false,
    validated: {
      by: person ? personName(person.first_name, person.last_name) : "—",
      at: data.validated_at,
    },
  };
}
