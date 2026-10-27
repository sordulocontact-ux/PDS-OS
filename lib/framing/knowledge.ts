import "server-only";

import type { Access } from "@/lib/auth/access";
import type { AudioState } from "@/lib/catalog/title-rules";
import type { Provenance } from "@/lib/framing/brief";
import { provenanceLookup } from "@/lib/framing/provenance";
import { loadFraming, type FramingData } from "@/lib/framing/queries";
import { todayInParis } from "@/lib/insights/dates";
import { listProjectCreatives } from "@/lib/projects/creatives";
import { getProject } from "@/lib/projects/queries";
import type { ProjectDetail } from "@/lib/projects/types";
import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type Tables = Database["public"]["Tables"];
type DeadlineRow = Tables["framing_deadlines"]["Row"];
type BriefVersionRow = Tables["framing_briefs"]["Row"];

export type KnownTitle = {
  id: string;
  title: string;
  artists: string;
  audioState: AudioState | null;
};
export type KnownCredit = {
  masterId: string;
  name: string;
  role: string;
  contactId: string | null;
};
export type KnownContract = {
  id: string;
  title: string;
  status: string;
  endsOn: string | null;
};
export type KnownBudgetLine = {
  label: string;
  amountCents: number;
  status: string;
};
export type KnownDecision = {
  id: string;
  what: string;
  quote: string;
  callTitle: string;
};
export type KnownEngineer = { id: string; name: string };
// An intervenant the Juridique added without a credit (lawyer, distributor…).
export type KnownLegalContact = {
  name: string;
  role: string;
  contactId: string;
};
// A contract a contact is party to (Contrats), for the legal parties.
export type PartyContract = {
  id: string;
  title: string;
  status: string;
  contactId: string;
};
type LegalPartyRow = Tables["framing_legal_parties"]["Row"];
export type FramingCallLink = {
  callId: string;
  title: string;
  occurredAt: string;
  status: string;
  hasReport: boolean;
};
export type BriefVersion = Omit<BriefVersionRow, "content"> & {
  content: unknown;
  createdByName: string | null;
  decidedByName: string | null;
};

/**
 * Everything PO consults before asking a question (ticket § 2 « Analyse
 * préalable »): the project and its team, the linked objects (titles,
 * credits, contracts, Budget, files), the history (calls, decisions, work
 * done), and what the Brief already records. Read once, in parallel, with
 * the user's session (RLS decides).
 */
export type FramingKnowledge = {
  project: ProjectDetail;
  framing: FramingData;
  deadlines: Array<DeadlineRow & { provenance: Provenance | null }>;
  titles: KnownTitle[];
  credits: KnownCredit[];
  contracts: KnownContract[];
  budgetLines: KnownBudgetLine[];
  files: Array<{ id: string; name: string; category: string }>;
  decisions: KnownDecision[];
  creatives: Array<{ personId: string; name: string }>;
  engineers: KnownEngineer[];
  legalContacts: KnownLegalContact[];
  // What a person decided for each legal party (PROJ-BUG-03).
  legalPartyDecisions: LegalPartyRow[];
  partyContracts: PartyContract[];
  masterBriefStarted: boolean;
  legalIntakeStarted: boolean;
  completeSplits: number;
  depositedDeclarations: number;
  briefs: BriefVersion[];
  calls: FramingCallLink[];
  acceptedAt: string | null;
  today: string;
};

const nameOf = (
  person: { first_name: string; last_name: string | null } | null,
) => (person ? personName(person.first_name, person.last_name) : null);

export async function loadFramingKnowledge(
  projectId: string,
  access: Access,
): Promise<FramingKnowledge | null> {
  const project = await getProject(projectId);
  if (!project) return null;
  const supabase = await createClient();
  const masterIds = project.masters.map((m) => m.id);
  const none = Promise.resolve({ data: [] as never[], error: null });

  const [
    framing,
    deadlinesRes,
    titlesRes,
    contributorsRes,
    performersRes,
    contractsRes,
    budgetRes,
    filesRes,
    decidedRes,
    creatives,
    engineersRes,
    legalContactsRes,
    masterBriefRes,
    legalRes,
    splitsRes,
    declarationsRes,
    briefsRes,
    callsRes,
  ] = await Promise.all([
    loadFraming(projectId, access),
    supabase
      .from("framing_deadlines")
      .select("*")
      .eq("project_id", projectId)
      .neq("review_status", "rejected")
      .order("due_date", { nullsFirst: false }),
    masterIds.length
      ? supabase.from("masters").select("id, audio_state").in("id", masterIds)
      : none,
    masterIds.length
      ? supabase
          .from("master_contributors")
          .select("master_id, name, role, contact_id")
          .in("master_id", masterIds)
      : none,
    masterIds.length
      ? supabase
          .from("master_artists")
          .select("master_id, role, artist:artists!inner(name)")
          .in("master_id", masterIds)
      : none,
    supabase
      .from("contracts")
      .select("id, title, status, ends_on")
      .eq("project_id", projectId)
      .order("created_at"),
    supabase
      .from("budget_lines")
      .select("label, amount_cents, status")
      .eq("project_id", projectId)
      .order("created_at"),
    supabase
      .from("project_files")
      .select("id, file_name, category, series_id, version")
      .eq("project_id", projectId)
      .order("version", { ascending: false }),
    supabase
      .from("report_items")
      .select(
        "id, what, quote, call_reports!inner(calls!inner(project_id, title))",
      )
      .eq("call_reports.calls.project_id", projectId)
      .eq("kind", "decided")
      .order("created_at"),
    listProjectCreatives(projectId),
    supabase
      .from("network_contacts")
      .select("id, name")
      .contains("roles", ["engineer"])
      .is("archived_at", null)
      .order("name"),
    // Read under manage_legal only (RLS): empty for anyone else.
    supabase
      .from("legal_project_contacts")
      .select(
        "contact_id, role, contact:network_contacts!legal_project_contacts_contact_same_org(name)",
      )
      .eq("project_id", projectId)
      .order("created_at"),
    supabase.from("master_briefs").select("id").eq("project_id", projectId),
    supabase.from("legal_intakes").select("id").eq("project_id", projectId),
    masterIds.length
      ? supabase
          .from("master_splits")
          .select("master_id, kind, share")
          .in("master_id", masterIds)
      : none,
    masterIds.length
      ? supabase
          .from("master_declarations")
          .select("id")
          .in("master_id", masterIds)
      : none,
    supabase
      .from("framing_briefs")
      .select(
        "*, creator:people!framing_briefs_created_by_fkey(first_name, last_name), decider:people!framing_briefs_decided_by_fkey(first_name, last_name)",
      )
      .eq("project_id", projectId)
      .order("version", { ascending: false }),
    supabase
      .from("calls")
      .select("id, title, occurred_at, status, call_reports(id)")
      .eq("project_id", projectId)
      .order("occurred_at", { ascending: false }),
  ]);
  if (!framing) return null;

  const deadlines = deadlinesRes.data ?? [];

  const audioOf = new Map(
    (titlesRes.data ?? []).map((t) => [t.id, t.audio_state as AudioState]),
  );
  const credits: KnownCredit[] = [
    ...(performersRes.data ?? []).map((p) => ({
      masterId: p.master_id,
      name: p.artist.name,
      role: p.role === "featuring" ? "featuring" : "performer",
      contactId: null,
    })),
    ...(contributorsRes.data ?? []).map((c) => ({
      masterId: c.master_id,
      name: c.name,
      role: c.role,
      contactId: c.contact_id,
    })),
  ];

  const legalContacts: KnownLegalContact[] = (
    legalContactsRes.data ?? []
  ).flatMap((row) =>
    row.contact
      ? [{ name: row.contact.name, role: row.role, contactId: row.contact_id }]
      : [],
  );
  // The legal parties' contacts, and the contracts each one is party to:
  // the only proof that lets code suggest « Existant » (PROJ-BUG-03).
  const contactIds = [
    ...new Set([
      ...credits.flatMap((c) => (c.contactId ? [c.contactId] : [])),
      ...framing.team.flatMap((m) =>
        m.contact_id && !m.person_id ? [m.contact_id] : [],
      ),
      ...legalContacts.map((c) => c.contactId),
    ]),
  ];
  // The deadlines' provenance is read in the same round trip (page loads
  // audit, docs/ARCHITECTURE.md § 3 bis).
  const [provenanceOf, legalPartiesRes, partiesRes] = await Promise.all([
    provenanceLookup(deadlines, framing.members),
    supabase
      .from("framing_legal_parties")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at"),
    contactIds.length
      ? supabase
          .from("contract_parties")
          .select("contact_id, contract:contracts!inner(id, title, status)")
          .in("contact_id", contactIds)
      : none,
  ]);
  const partyContracts: PartyContract[] = (partiesRes.data ?? []).map(
    (row) => ({
      id: row.contract.id,
      title: row.contract.title,
      status: row.contract.status,
      contactId: row.contact_id,
    }),
  );

  // A title's split is complete at 100 % per kind (computed by code).
  const totals = new Map<string, number>();
  for (const s of splitsRes.data ?? []) {
    const key = `${s.master_id}:${s.kind}`;
    totals.set(key, (totals.get(key) ?? 0) + Number(s.share));
  }
  const completeSplits = [...totals.values()].filter(
    (total) => Math.round(total * 100) === 10000,
  ).length;

  // Latest version of each file.
  const seenSeries = new Set<string>();
  const files = (filesRes.data ?? []).flatMap((f) => {
    if (seenSeries.has(f.series_id)) return [];
    seenSeries.add(f.series_id);
    return [{ id: f.id, name: f.file_name, category: f.category }];
  });

  const accepted = project.assignments.find((a) => a.status === "accepted");

  return {
    project,
    framing,
    deadlines: deadlines.map((d) => ({ ...d, provenance: provenanceOf(d) })),
    titles: project.masters.map((m) => ({
      id: m.id,
      title: m.title,
      artists: m.artists,
      audioState: audioOf.get(m.id) ?? null,
    })),
    credits,
    contracts: (contractsRes.data ?? []).map((c) => ({
      id: c.id,
      title: c.title,
      status: c.status,
      endsOn: c.ends_on,
    })),
    budgetLines: (budgetRes.data ?? []).map((b) => ({
      label: b.label,
      amountCents: Number(b.amount_cents),
      status: b.status,
    })),
    files,
    decisions: (decidedRes.data ?? []).map((d) => ({
      id: d.id,
      what: d.what,
      quote: d.quote,
      callTitle: d.call_reports.calls.title,
    })),
    creatives,
    engineers: (engineersRes.data ?? []).map((e) => ({
      id: e.id,
      name: e.name,
    })),
    legalContacts,
    legalPartyDecisions: legalPartiesRes.data ?? [],
    partyContracts,
    masterBriefStarted: (masterBriefRes.data ?? []).length > 0,
    legalIntakeStarted: (legalRes.data ?? []).length > 0,
    completeSplits,
    depositedDeclarations: (declarationsRes.data ?? []).length,
    briefs: (briefsRes.data ?? []).map(({ creator, decider, ...row }) => ({
      ...row,
      createdByName: nameOf(creator),
      decidedByName: nameOf(decider),
    })),
    calls: (callsRes.data ?? []).map((c) => ({
      callId: c.id,
      title: c.title,
      occurredAt: c.occurred_at,
      status: c.status,
      hasReport: (c.call_reports ?? []).length > 0,
    })),
    acceptedAt: accepted?.respondedAt ?? null,
    today: todayInParis(),
  };
}

/**
 * The Cadrage has really begun: its stage is in progress and PO has read
 * the initial context, if there is one. Until then the entry offers
 * « Commencer le cadrage » (which runs that reading), not « Reprendre ».
 */
export function framingStarted(k: FramingKnowledge): boolean {
  const stage = k.framing.stage?.state ?? "not_started";
  const contextRead =
    !k.project.initialContext?.trim() ||
    k.framing.briefRows.some((r) => r.field_key === "context_analysis");
  return stage !== "not_started" && contextRead;
}
