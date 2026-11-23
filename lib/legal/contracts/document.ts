import "server-only";

import { fr } from "@/lib/i18n/fr";
import {
  asContractLanguage,
  type ContractLanguage,
} from "@/lib/legal/contracts/language";
import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

// The generated document of a contract (ticket Juridique 03): its versions,
// the template it came from, the values injected with their source, the
// journal and the money it commits. Null for a contract written by hand.
// Read with the viewer's session (RLS: can_see_contract).

export type DocumentVersion = {
  version: number;
  body: string;
  comment: string | null;
  by: string;
  at: string;
};

export type ContractDocument = {
  latest: DocumentVersion;
  versions: DocumentVersion[];
  template: { name: string; version: number } | null;
  // Its template's language (Ibé, 18/11/2026): the PDF's.
  language: ContractLanguage;
  fields: Array<{ id: string; label: string; value: string; source: string }>;
  financialNeedCents: number | null;
  proof: { signed: boolean; evidence: boolean };
};

export async function getContractDocument(
  contractId: string,
): Promise<ContractDocument | null> {
  const supabase = await createClient();
  const [documents, money, files] = await Promise.all([
    supabase
      .from("contract_documents")
      .select(
        "version, body, comment, fields, template_id, template_version, created_by, created_at",
      )
      .eq("contract_id", contractId)
      .order("version", { ascending: false }),
    supabase
      .from("financial_needs")
      .select("amount_cents")
      .eq("contract_id", contractId)
      .maybeSingle(),
    supabase
      .from("contract_files")
      .select("category")
      .eq("contract_id", contractId),
  ]);
  if (documents.error)
    console.error("getContractDocument:", documents.error.message);
  const rows = documents.data ?? [];
  if (rows.length === 0) return null;

  const peopleIds = [
    ...new Set([...rows.flatMap((r) => (r.created_by ? [r.created_by] : []))]),
  ];
  const [template, people] = await Promise.all([
    supabase
      .from("contract_templates")
      .select("name, version, language")
      .eq("id", rows[0].template_id)
      .maybeSingle(),
    peopleIds.length > 0
      ? supabase
          .from("people")
          .select("id, first_name, last_name")
          .in("id", peopleIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const nameOf = new Map(
    (people.data ?? []).map((p) => [
      p.id,
      personName(p.first_name, p.last_name),
    ]),
  );
  const who = (id: string | null) => (id ? (nameOf.get(id) ?? "") : "");

  const versions = rows.map((r) => ({
    version: r.version,
    body: r.body,
    comment: r.comment,
    by: who(r.created_by),
    at: r.created_at,
  }));
  const injected = (rows[0].fields ?? {}) as Record<
    string,
    { value?: unknown; source?: unknown }
  >;
  const categories = new Set((files.data ?? []).map((f) => f.category));
  return {
    latest: versions[0],
    versions,
    template: template.data
      ? { name: template.data.name, version: rows[0].template_version }
      : null,
    language: asContractLanguage(template.data?.language),
    fields: Object.entries(injected).map(([id, v]) => ({
      id,
      label: fr.legalContracts.fields[id] ?? id,
      value: String(v?.value ?? ""),
      source: String(v?.source ?? ""),
    })),
    financialNeedCents: money.data?.amount_cents ?? null,
    proof: {
      signed: categories.has("signed"),
      evidence: categories.has("evidence"),
    },
  };
}
