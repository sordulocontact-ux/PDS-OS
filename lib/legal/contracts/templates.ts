import "server-only";

import { can, type Access } from "@/lib/auth/access";
import { asContractType, type ContractType } from "@/lib/contracts/types";
import { FORM_ROLES, type FormRole } from "@/lib/legal/forms/definition";
import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

// The template library (ticket Juridique 03), read with the viewer's session
// (RLS: manage_legal or manage_contracts).

export type TemplateStatus = "draft" | "validated" | "retired";

export type TemplateVersion = {
  id: string;
  version: number;
  status: TemplateStatus;
  createdAt: string;
};

export type ContractTemplate = {
  id: string;
  seriesId: string;
  version: number;
  name: string;
  type: ContractType;
  roles: FormRole[];
  usage: string | null;
  body: string;
  fields: string[];
  status: TemplateStatus;
  validatedBy: string | null;
  validatedAt: string | null;
  // Why the director refused it, or why it was retired (JUR-19).
  retiredReason: string | null;
  source: { path: string; name: string } | null;
};

// One line per template: its latest version, the others listed under it.
export type TemplateSeries = ContractTemplate & {
  versions: TemplateVersion[];
  can: { validate: boolean; retire: boolean; newVersion: boolean };
};

const asStatus = (value: string): TemplateStatus =>
  value === "validated" || value === "retired" ? value : "draft";

const asRoles = (roles: string[]) =>
  roles.filter((r): r is FormRole =>
    (FORM_ROLES as readonly string[]).includes(r),
  );

/** Every version the viewer may read, latest first within a series. */
export async function listTemplates(): Promise<ContractTemplate[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contract_templates")
    .select(
      "id, series_id, version, name, type, roles, usage, body, fields, status, validated_by, validated_at, retired_reason, source_path, source_name",
    )
    .order("name")
    .order("version", { ascending: false })
    .limit(500);
  if (error) console.error("listTemplates:", error.message);
  const rows = data ?? [];
  const validatorIds = [
    ...new Set(rows.flatMap((r) => (r.validated_by ? [r.validated_by] : []))),
  ];
  const people =
    validatorIds.length > 0
      ? await supabase
          .from("people")
          .select("id, first_name, last_name")
          .in("id", validatorIds)
      : { data: [] };
  const nameOf = new Map(
    (people.data ?? []).map((p) => [
      p.id,
      personName(p.first_name, p.last_name),
    ]),
  );
  return rows.map((row) => ({
    id: row.id,
    seriesId: row.series_id,
    version: row.version,
    name: row.name,
    type: asContractType(row.type),
    roles: asRoles(row.roles),
    usage: row.usage,
    body: row.body,
    fields: row.fields,
    status: asStatus(row.status),
    validatedBy: row.validated_by
      ? (nameOf.get(row.validated_by) ?? null)
      : null,
    validatedAt: row.validated_at,
    retiredReason: row.retired_reason,
    source:
      row.source_path && row.source_name
        ? { path: row.source_path, name: row.source_name }
        : null,
  }));
}

export async function listTemplateSeries(
  access: Access,
): Promise<TemplateSeries[]> {
  const rows = await listTemplates();
  const series = new Map<string, ContractTemplate[]>();
  for (const row of rows)
    series.set(row.seriesId, [...(series.get(row.seriesId) ?? []), row]);
  return [...series.values()].map((versions) => {
    const latest = versions[0];
    return {
      ...latest,
      versions: versions.map((v) => ({
        id: v.id,
        version: v.version,
        status: v.status,
        createdAt: v.validatedAt ?? "",
      })),
      can: {
        validate: latest.status === "draft" && can(access, "validate"),
        retire: latest.status !== "retired" && can(access, "manage_legal"),
        newVersion: can(access, "manage_legal"),
      },
    };
  });
}

/** Validated templates only: what the mapping may propose. */
export async function listValidatedTemplates(): Promise<ContractTemplate[]> {
  return (await listTemplates()).filter((t) => t.status === "validated");
}
