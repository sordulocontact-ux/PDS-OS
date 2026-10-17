import "server-only";

import { routes } from "@/lib/auth/redirects";
import { createClient } from "@/lib/supabase/server";

export type LegalOrigin =
  | { kind: "agreement"; projectId: string; href: string }
  | { kind: "clearance"; element: string; href: string };

/**
 * Where a contract comes from in the Juridique (JUR-17): the contracts to
 * plan of a project (a person's agreement), or a borrowing's authorization.
 * Read with the person's session: someone without the Juridique gets null.
 */
export async function legalOriginOf(
  contractId: string,
): Promise<LegalOrigin | null> {
  const supabase = await createClient();
  const [need, clearance] = await Promise.all([
    supabase
      .from("legal_agreement_needs")
      .select("project_id")
      .eq("contract_id", contractId)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("legal_clearance_contracts")
      .select("clearance_id")
      .eq("contract_id", contractId)
      .limit(1)
      .maybeSingle(),
  ]);
  if (need.data?.project_id)
    return {
      kind: "agreement",
      projectId: need.data.project_id,
      href: routes.projectLegalStep(need.data.project_id, "tracking"),
    };
  const clearanceId = clearance.data?.clearance_id;
  const { data: c } = clearanceId
    ? await supabase
        .from("legal_clearances")
        .select("id, project_id, element")
        .eq("id", clearanceId)
        .maybeSingle()
    : { data: null };
  if (c)
    return {
      kind: "clearance",
      element: c.element,
      href: `${routes.projectLegalStep(c.project_id, "clearances")}?emprunt=${c.id}`,
    };
  return null;
}
