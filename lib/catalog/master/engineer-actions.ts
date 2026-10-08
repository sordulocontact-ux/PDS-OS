"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import type { SessionKind } from "@/lib/catalog/master/rules";
import { fr } from "@/lib/i18n/fr";
import { rankedNetwork, type RankedPerson } from "@/lib/network/ranked-people";
import { createClient } from "@/lib/supabase/server";

const ENGINEER_CREDITS = [
  "recording_engineer",
  "mix_engineer",
  "mastering_engineer",
] as const;
type EngineerCredit = (typeof ENGINEER_CREDITS)[number];

type Credit = { name: string; role: string; contact_id: string | null };

// Who is proposed for a session of each kind: the credit of that work.
const CREDIT_OF_KIND: Record<SessionKind, EngineerCredit> = {
  recording: "recording_engineer",
  production: "recording_engineer",
  mixing: "mix_engineer",
  mastering: "mastering_engineer",
  other: "recording_engineer",
};

// The engineer a session form starts with: a contact of the Réseau (`ref`)
// or, for a credit not linked to one, its name.
export type EngineerSuggestion = { ref: string | null; name: string };

/** The credited engineers first (once each, with their credits), keyed by
 * contact: what rankedNetwork puts in front. */
function creditedFirst(credits: Credit[], credited: string) {
  const roles = fr.masterPage.credits.roles as Record<string, string>;
  const first = new Map<string, string>();
  for (const credit of credits) {
    if (!credit.contact_id) continue;
    const role = roles[credit.role] ?? credit.role;
    const known = first.get(credit.contact_id);
    if (known?.includes(role)) continue;
    first.set(
      credit.contact_id,
      known ? `${known}, ${role}` : `${credited} · ${role}`,
    );
  }
  return first;
}

/**
 * The engineer of a session of a title (Sacha, 07/10/2026): the engineers
 * credited on the title first, then the Réseau's engineers, then the rest;
 * and, per kind of session, who to propose: the credit of that work, else
 * the engineer chosen in a Brief Mix/Master of the title's projects.
 */
export async function listSessionEngineers(masterId: string): Promise<{
  options: RankedPerson[];
  suggested: Partial<Record<SessionKind, EngineerSuggestion>>;
}> {
  await requireApproved();
  const id = z.uuid().safeParse(masterId);
  if (!id.success) return { options: [], suggested: {} };
  const supabase = await createClient();
  const [credits, projects] = await Promise.all([
    supabase
      .from("master_contributors")
      .select("name, role, contact_id")
      .eq("master_id", id.data)
      .in("role", ENGINEER_CREDITS)
      .order("created_at"),
    supabase
      .from("project_masters")
      .select("project_id")
      .eq("master_id", id.data),
  ]);
  if (credits.error)
    console.error("listSessionEngineers:", credits.error.message);
  const projectIds = (projects.data ?? []).map((row) => row.project_id);
  const briefs = projectIds.length
    ? await supabase
        .from("master_briefs")
        .select("mix_contact_id, mastering_contact_id, mastering_same_engineer")
        .in("project_id", projectIds)
    : { data: [] };
  const rows = credits.data ?? [];
  const options = await rankedNetwork(
    supabase,
    "engineer",
    creditedFirst(rows, fr.masterPage.splits.party.credited),
  );

  const briefOf = (role: EngineerCredit) =>
    (briefs.data ?? [])
      .map((b) =>
        role === "mix_engineer"
          ? b.mix_contact_id
          : role === "mastering_engineer"
            ? b.mastering_same_engineer
              ? b.mix_contact_id
              : b.mastering_contact_id
            : null,
      )
      .find((contact): contact is string => contact !== null) ?? null;
  const suggestionOf = (role: EngineerCredit): EngineerSuggestion | null => {
    const credit =
      rows.find((c) => c.role === role && c.contact_id) ??
      rows.find((c) => c.role === role);
    if (credit) return { ref: credit.contact_id, name: credit.name };
    const contact = briefOf(role);
    const option = options.find((o) => o.id === contact);
    return option ? { ref: option.id, name: option.label } : null;
  };
  const suggested: Partial<Record<SessionKind, EngineerSuggestion>> = {};
  for (const [kind, role] of Object.entries(CREDIT_OF_KIND)) {
    const suggestion = suggestionOf(role);
    if (suggestion) suggested[kind as SessionKind] = suggestion;
  }
  return { options, suggested };
}

/**
 * The engineers a Brief Mix/Master may name: those credited on the
 * project's titles first, then the Réseau's engineers, then the rest of the
 * Réseau (a contact is required: the brief stores its id).
 */
export async function listBriefEngineers(
  projectId: string,
): Promise<RankedPerson[]> {
  await requireApproved();
  const id = z.uuid().safeParse(projectId);
  if (!id.success) return [];
  const supabase = await createClient();
  const { data: titles } = await supabase
    .from("project_masters")
    .select("master_id")
    .eq("project_id", id.data);
  const masterIds = (titles ?? []).map((row) => row.master_id);
  const credits = masterIds.length
    ? await supabase
        .from("master_contributors")
        .select("name, role, contact_id")
        .in("master_id", masterIds)
        .in("role", ENGINEER_CREDITS)
        .not("contact_id", "is", null)
        .order("created_at")
    : { data: [] };
  return rankedNetwork(
    supabase,
    "engineer",
    creditedFirst(
      credits.data ?? [],
      fr.masterWorkflow.brief.engineerContact.credited,
    ),
  );
}
