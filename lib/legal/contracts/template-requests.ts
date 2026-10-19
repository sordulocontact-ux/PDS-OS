import "server-only";

import { fr } from "@/lib/i18n/fr";
import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

// The templates made from this project's « Contrats à prévoir » and asked
// of the direction (proto « Projet complet », rule 18): the direction
// validates or refuses them in the Plan d'action; the one who made it reads
// the decision in the contracts to provide. Read with the viewer's session
// (RLS: manage_legal or manage_contracts).

export type TemplateRequest = {
  id: string;
  name: string;
  status: "draft" | "validated" | "retired";
  // The person of « Contrats à prévoir » it was made for.
  key: string;
  forName: string;
  roles: string[];
  fields: string[];
  sourceName: string | null;
  seriesId: string;
  createdBy: string;
  createdAt: string;
  // The direction's refusal, signed.
  refusal: { by: string; reason: string } | null;
};

export async function loadTemplateRequests(
  projectId: string,
): Promise<TemplateRequest[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contract_templates")
    .select(
      "id, series_id, name, status, roles, fields, source_name, requested_key, requested_for, created_by, created_at, retired_reason, retired_by",
    )
    .eq("requested_project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) console.error("loadTemplateRequests:", error.message);
  const rows = data ?? [];
  const ids = [
    ...new Set(
      rows.flatMap((r) => [r.created_by, r.retired_by]).filter(Boolean),
    ),
  ] as string[];
  const people =
    ids.length > 0
      ? await supabase
          .from("people")
          .select("id, first_name, last_name")
          .in("id", ids)
      : { data: [] };
  const nameOf = new Map(
    (people.data ?? []).map((p) => [
      p.id,
      personName(p.first_name, p.last_name),
    ]),
  );
  const roles = fr.legalForms.roles as Record<string, string>;
  const labels = fr.legalContracts.fields as Record<string, string>;
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    status:
      r.status === "validated" || r.status === "retired" ? r.status : "draft",
    key: r.requested_key ?? "",
    forName: r.requested_for ?? "",
    roles: r.roles.map((role) => roles[role] ?? role),
    fields: r.fields.map((f) => labels[f] ?? f),
    sourceName: r.source_name,
    seriesId: r.series_id,
    createdBy: (r.created_by && nameOf.get(r.created_by)) || "—",
    createdAt: r.created_at,
    refusal:
      r.status === "retired" && r.retired_reason
        ? {
            by: (r.retired_by && nameOf.get(r.retired_by)) || "—",
            reason: r.retired_reason,
          }
        : null,
  }));
}

/** Per person of « Contrats à prévoir »: their latest request. */
export function latestRequestOf(
  requests: TemplateRequest[],
): Map<string, TemplateRequest> {
  const out = new Map<string, TemplateRequest>();
  for (const r of requests) if (!out.has(r.key)) out.set(r.key, r);
  return out;
}
