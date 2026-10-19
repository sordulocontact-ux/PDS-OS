import "server-only";

import type { Access } from "@/lib/auth/access";
import { loadMembers } from "@/lib/framing/related";
import { buildLegalEvents } from "@/lib/legal/history/build";
import type { LegalHistory } from "@/lib/legal/history/types";
import { createClient } from "@/lib/supabase/server";

type Project = { id: string; masters: Array<{ id: string; title: string }> };

/**
 * Every event of a project's Juridique, newest first (JUR-29), read with the
 * person's session: what RLS hides stays hidden. `complete` is false when a
 * journal could not be read, so the page never shows a partial history as
 * the whole one.
 */
export async function loadLegalHistory(
  project: Project,
  access: Access,
): Promise<LegalHistory> {
  const supabase = await createClient();
  const p = project.id;
  const [
    members,
    plans,
    planItems,
    planEvents,
    intakes,
    forms,
    contracts,
    clearances,
    sheets,
    formalities,
  ] = await Promise.all([
    loadMembers(access),
    supabase
      .from("legal_plans")
      .select("id, confirmed_at, confirmed_by, launched_at, launched_by")
      .eq("project_id", p),
    supabase.from("legal_plan_items").select("id, label").eq("project_id", p),
    supabase
      .from("legal_plan_events")
      .select(
        "id, item_id, kind, from_value, to_value, reason, created_by, created_at",
      )
      .eq("project_id", p),
    supabase
      .from("legal_intakes")
      .select("id, confirmed_at, confirmed_by")
      .eq("project_id", p),
    supabase
      .from("legal_forms")
      .select(
        "id, contact_id, created_at, created_by, sent_at, submitted_at, completed_at, revoked_at",
      )
      .eq("project_id", p),
    supabase.from("contracts").select("id, title").eq("project_id", p),
    supabase.from("legal_clearances").select("id, element").eq("project_id", p),
    supabase
      .from("legal_split_sheets")
      .select("id, master_id")
      .eq("project_id", p),
    supabase
      .from("legal_formalities")
      .select("id, master_id")
      .eq("project_id", p),
  ]);

  const contractIds = (contracts.data ?? []).map((c) => c.id);
  const clearanceIds = (clearances.data ?? []).map((c) => c.id);
  const sheetIds = (sheets.data ?? []).map((s) => s.id);
  const formalityIds = (formalities.data ?? []).map((f) => f.id);
  const none = { data: [], error: null };
  const versions = sheetIds.length
    ? await supabase
        .from("legal_split_versions")
        .select("id, sheet_id, version")
        .in("sheet_id", sheetIds)
    : none;
  const versionIds = (versions.data ?? []).map((v) => v.id);
  const contactIds = [...new Set((forms.data ?? []).map((f) => f.contact_id))];
  const contacts = contactIds.length
    ? await supabase
        .from("network_contacts")
        .select("id, name")
        .in("id", contactIds)
    : none;
  const [
    contractEvents,
    clearanceEvents,
    splitEvents,
    entries,
    formEvents,
    signatures,
  ] = await Promise.all([
    supabase
      .from("contract_events")
      .select("id, contract_id, kind, note, actor_person_id, created_at")
      .or(
        contractIds.length
          ? `project_id.eq.${p},contract_id.in.(${contractIds.join(",")})`
          : `project_id.eq.${p}`,
      ),
    clearanceIds.length
      ? supabase
          .from("legal_clearance_events")
          .select("id, clearance_id, kind, note, actor_person_id, created_at")
          .in("clearance_id", clearanceIds)
      : none,
    versionIds.length
      ? supabase
          .from("legal_split_events")
          .select(
            "id, version_id, entry_id, kind, note, actor_person_id, created_at",
          )
          .in("version_id", versionIds)
      : none,
    versionIds.length
      ? supabase
          .from("legal_split_entries")
          .select("id, name")
          .in("version_id", versionIds)
      : none,
    formalityIds.length
      ? supabase
          .from("legal_formality_events")
          .select("id, formality_id, kind, note, actor_person_id, created_at")
          .in("formality_id", formalityIds)
      : none,
    formalityIds.length
      ? supabase
          .from("legal_formality_signatures")
          .select(
            "id, formality_id, signer, signed_at, proof, recorded_by, document_version",
          )
          .in("formality_id", formalityIds)
          .not("signed_at", "is", null)
      : none,
  ]);

  const results = [
    plans,
    planItems,
    planEvents,
    intakes,
    forms,
    contracts,
    clearances,
    sheets,
    formalities,
    versions,
    contacts,
    contractEvents,
    clearanceEvents,
    splitEvents,
    entries,
    formEvents,
    signatures,
  ];
  const failed = results.filter((r) => r.error);
  for (const r of failed) console.error("loadLegalHistory:", r.error?.message);

  const data = <T>(result: { data: T[] | null }) => result.data ?? [];
  return {
    events: buildLegalEvents({
      projectId: p,
      masters: project.masters,
      members,
      plans: data(plans),
      planItems: data(planItems),
      planEvents: data(planEvents),
      intakes: data(intakes),
      forms: data(forms),
      contracts: data(contracts),
      clearances: data(clearances),
      sheets: data(sheets),
      formalities: data(formalities),
      versions: data(versions),
      contacts: data(contacts),
      contractEvents: data(contractEvents),
      clearanceEvents: data(clearanceEvents),
      splitEvents: data(splitEvents),
      entries: data(entries),
      formEvents: data(formEvents),
      signatures: data(signatures),
    }),
    complete: failed.length === 0,
  };
}
