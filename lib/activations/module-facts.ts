import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

/**
 * The module objects of a project's activations, in one round, with the
 * user's session (RLS decides: amounts, agreements and payments reach the
 * budget readers only): targets and their contacts, sheets, messages,
 * influence proposals, agreements, rights, contents and payments, press
 * opportunities, agency sources, previews, rows and reports, and the
 * transmissions to an agency. What the next actions, the alerts and the
 * computed proof need (lib/activations/modules.ts, actors.ts,
 * derived-proof.ts).
 */
export const loadModuleFacts = cache(async (projectId: string) => {
  const supabase = await createClient();
  const [
    targets,
    sheets,
    messages,
    proposals,
    agreements,
    rights,
    contents,
    payments,
    opportunities,
    sources,
    snapshots,
    rows,
    reports,
    transmissions,
  ] = await Promise.all([
    supabase
      .from("activation_targets")
      .select("id, activation_id, contact_id, journalist_contact_id, outcome")
      .eq("project_id", projectId)
      .order("created_at"),
    supabase
      .from("activation_sheets")
      .select("activation_id, kind, target_id, version, status")
      .eq("project_id", projectId)
      .order("version", { ascending: false }),
    supabase
      .from("activation_messages")
      .select(
        "id, activation_id, target_id, kind, status, sent_declared_at, created_at",
      )
      .eq("project_id", projectId)
      .order("created_at"),
    supabase
      .from("influence_proposals")
      .select("target_id, party, fee_amount, accepted_at, created_at")
      .eq("project_id", projectId)
      .order("created_at"),
    supabase
      .from("influence_agreements")
      .select("target_id, status, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false }),
    supabase
      .from("influence_rights")
      .select("activation_id, target_id, kind, status, ends_on, superseded_at")
      .eq("project_id", projectId)
      .is("superseded_at", null),
    supabase
      .from("influence_contents")
      .select("activation_id, target_id, decision, created_at")
      .eq("project_id", projectId)
      .order("created_at"),
    supabase
      .from("influence_payments")
      .select("target_id, status")
      .eq("project_id", projectId),
    supabase
      .from("press_opportunities")
      .select("id, activation_id, target_id, status, scheduled_at")
      .eq("project_id", projectId)
      .order("created_at"),
    supabase
      .from("agency_sources")
      .select("id, activation_id, label, agency_person, key_fields")
      .eq("project_id", projectId),
    supabase
      .from("agency_snapshots")
      .select("activation_id, status")
      .eq("project_id", projectId)
      .eq("status", "preview"),
    supabase
      .from("agency_rows")
      .select(
        "id, activation_id, pds_decision, agency_status, decided_at, absent_since",
      )
      .eq("project_id", projectId),
    supabase
      .from("agency_reports")
      .select("activation_id, status")
      .eq("project_id", projectId),
    supabase
      .from("activation_events")
      .select("activation_id, actor, at")
      .eq("project_id", projectId)
      .eq("kind", "agency.transmitted")
      .order("at", { ascending: false }),
  ]);
  const all = [
    targets,
    sheets,
    messages,
    proposals,
    agreements,
    rights,
    contents,
    payments,
    opportunities,
    sources,
    snapshots,
    rows,
    reports,
    transmissions,
  ];
  const failed = all.map((r) => r.error).find(Boolean);
  if (failed) console.error("loadModuleFacts:", failed.message);
  const contactIds = [
    ...new Set(
      (targets.data ?? []).flatMap((x) => [
        x.contact_id,
        ...(x.journalist_contact_id ? [x.journalist_contact_id] : []),
      ]),
    ),
  ];
  const { data: contacts } = contactIds.length
    ? await supabase
        .from("network_contacts")
        .select("id, name")
        .in("id", contactIds)
    : { data: [] };
  const names = new Map((contacts ?? []).map((c) => [c.id, c.name]));
  return {
    targets: (targets.data ?? []).map((x) => ({
      ...x,
      name: names.get(x.contact_id) ?? "—",
    })),
    sheets: sheets.data ?? [],
    messages: messages.data ?? [],
    proposals: proposals.data ?? [],
    agreements: agreements.data ?? [],
    rights: rights.data ?? [],
    contents: contents.data ?? [],
    payments: payments.data ?? [],
    opportunities: opportunities.data ?? [],
    sources: sources.data ?? [],
    snapshots: snapshots.data ?? [],
    rows: rows.data ?? [],
    reports: reports.data ?? [],
    transmissions: transmissions.data ?? [],
  };
});

export type ModuleFacts = Awaited<ReturnType<typeof loadModuleFacts>>;
