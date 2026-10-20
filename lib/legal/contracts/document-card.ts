import "server-only";

import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

// What the card of a generated contract shows in its démarche (proto
// « Projet complet », rule 18): its version, the text a clause revision
// works on, each version after the first with its clause, who and the
// words it changed (« Changé depuis la v1 »), and the direction's last
// return. Read with the viewer's session (RLS: can_see_contract).

export type ContractChange = {
  version: number;
  clause: string | null;
  by: string;
  // The paragraph the version changed, else why it changed.
  text: string;
};

export type ContractCardData = {
  version: number;
  body: string;
  changes: ContractChange[];
  // « Claire Morel (demander des modifications) : « … » ».
  review: { by: string; note: string } | null;
};

const MAX = 180;
const short = (text: string) =>
  text.length > MAX ? `${text.slice(0, MAX - 1).trimEnd()}…` : text;
const paragraphs = (body: string) =>
  body
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

/** The first paragraph of `next` that `previous` did not have. Pure. */
export function changedParagraph(previous: string, next: string): string {
  const before = new Set(paragraphs(previous));
  return paragraphs(next).find((p) => !before.has(p)) ?? "";
}

export async function loadContractCards(
  contractIds: string[],
): Promise<Record<string, ContractCardData>> {
  if (contractIds.length === 0) return {};
  const supabase = await createClient();
  const [documents, contracts] = await Promise.all([
    supabase
      .from("contract_documents")
      .select("contract_id, version, body, comment, clause, created_by")
      .in("contract_id", contractIds)
      .order("version"),
    supabase
      .from("contracts")
      .select("id, status, review_comment, reviewed_by")
      .in("id", contractIds),
  ]);
  if (documents.error)
    console.error("loadContractCards:", documents.error.message);
  const ids = [
    ...new Set(
      [
        ...(documents.data ?? []).map((d) => d.created_by),
        ...(contracts.data ?? []).map((c) => c.reviewed_by),
      ].filter(Boolean),
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
  const out: Record<string, ContractCardData> = {};
  for (const id of contractIds) {
    const versions = (documents.data ?? []).filter((d) => d.contract_id === id);
    const latest = versions[versions.length - 1];
    if (!latest) continue;
    const contract = (contracts.data ?? []).find((c) => c.id === id);
    out[id] = {
      version: latest.version,
      body: latest.body,
      changes: versions.slice(1).map((v, i) => ({
        version: v.version,
        clause: v.clause,
        by: (v.created_by && nameOf.get(v.created_by)) || "—",
        text: short(
          changedParagraph(versions[i].body, v.body) || (v.comment ?? ""),
        ),
      })),
      // A return is read while the contract is back in draft.
      review:
        contract?.status === "draft" && contract.review_comment
          ? {
              by:
                (contract.reviewed_by && nameOf.get(contract.reviewed_by)) ||
                "—",
              note: contract.review_comment,
            }
          : null,
    };
  }
  return out;
}
