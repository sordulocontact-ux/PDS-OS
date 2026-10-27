import "server-only";

import { audioStateOf, type AudioState } from "@/lib/catalog/title-rules";
import { listProjectCreatives } from "@/lib/projects/creatives";
import { personName } from "@/lib/projects/types";
import {
  masterBriefRow,
  masterTransmissionRows,
  masterVersionRows,
} from "@/lib/master-workflow/shared-rows";
import { createClient } from "@/lib/supabase/server";

// What the Master's journey reads (lib/master-workflow/journey.ts), in one
// round of parallel queries with the viewer's session: RLS decides what
// appears. Lean on purpose: the project's journeys are read on every page
// of a project (sidebar counts, « Maintenant »).

type Named = { first_name: string; last_name: string | null } | null;
const nameOf = (p: Named) => (p ? personName(p.first_name, p.last_name) : null);

export type JourneyAudio = {
  id: string;
  fileName: string;
  audioState: AudioState;
  createdAt: string;
};

/** One confirmation of a title's source (append-only). */
export type JourneySource = {
  fileId: string;
  fileName: string;
  confirmedAt: string;
  confirmedBy: string | null;
  // Declared at the confirmation (null before 19/10/2026: not asked).
  vocalsFinal: boolean | null;
  vocalsPending: string | null;
  plan: "wait" | "anticipate" | null;
};

export type JourneyTransmission = {
  id: string;
  role: "mix" | "mastering";
  contactId: string;
  contactName: string;
  createdAt: string;
  linkSentAt: string | null;
  openedAt: string | null;
  acknowledgedAt: string | null;
  deliveredAt: string | null;
  revokedAt: string | null;
  revokeReason: string | null;
  expiresAt: string;
  sentBy: string | null;
  continued: boolean;
};

export type JourneyVersion = {
  id: string;
  masterId: string;
  stage: "mix" | "mastering";
  number: number;
  fileName: string;
  createdAt: string;
  createdBy: string | null;
  feedbackSentAt: string | null;
  decision: "approved" | "changes_requested" | "reopened" | null;
  decidedAt: string | null;
  decidedBy: string | null;
  reopenedAt: string | null;
  reopenReason: string | null;
  sourceFileId: string | null;
  // An existing mix declared Mix final (declare_mix_final): created and
  // decided in the same transaction.
  declared: boolean;
};

export type MasterJourneyFacts = {
  // In the project's order; newest audio first.
  titles: Array<{
    id: string;
    title: string;
    artists: string;
    audio: JourneyAudio[];
    // Newest first: the first is the current source.
    sources: JourneySource[];
  }>;
  brief: {
    recordedAt: string | null;
    recordedBy: string | null;
    contentChangedAt: string;
    dirty: boolean;
    startMode: string | null;
    // Something to say in « direction artistique ».
    hasDirection: boolean;
    updatedAt: string;
    updatedBy: string | null;
    createdAt: string;
    validatorId: string | null;
    validatorName: string | null;
    mixContact: { id: string; name: string } | null;
    masteringSame: boolean;
    masteringContact: { id: string; name: string } | null;
    // In-house engineers (members), and when their round was assigned.
    mixPerson: { personId: string; name: string } | null;
    masteringPerson: { personId: string; name: string } | null;
    mixAssignedAt: string | null;
    masteringAssignedAt: string | null;
    deliverables: string[];
    masterFinalDue: string | null;
  } | null;
  // The project's creative director (Cadrage › Équipe), the default
  // validator of the versions (VISION-UX rule 22).
  creative: { personId: string; name: string } | null;
  transmissions: JourneyTransmission[];
  versions: JourneyVersion[];
  received: Array<{
    masterId: string;
    deliverable: string;
    at: string;
    by: string | null;
  }>;
  messages: Array<{
    stage: "mix" | "mastering";
    kind: string;
    status: string | null;
    createdAt: string;
    // A delay sent to the direction.
    escalatedAt: string | null;
  }>;
  questions: Array<{
    askedTo: string | null;
    askedToName: string | null;
    createdAt: string;
    answeredAt: string | null;
    appliedAt: string | null;
  }>;
  exchanges: Array<{ title: string; occurredAt: string; status: string }>;
  planLaunchedAt: string | null;
  // The Master's budget lines (owner and direction only, RLS): a rate
  // proposed by the engineer waits for « Accepter le tarif ».
  rates: Array<{ stage: "mix" | "mastering"; status: string }>;
  // The engineers' invoices (owner and direction only, RLS).
  invoices: JourneyInvoice[];
  failed: boolean;
};

export type JourneyInvoice = {
  id: string;
  contactName: string;
  requestedAt: string;
  number: string | null;
  amountCents: number | null;
  receivedAt: string | null;
  viaLink: boolean;
  receivedBy: string | null;
  bankChanged: boolean;
  // A new RIB waits for the direction's phone call.
  bankPending: boolean;
  paidOn: string | null;
  paidAt: string | null;
  paidBy: string | null;
};

export async function loadMasterJourneyFacts(project: {
  id: string;
  masters: Array<{ id: string; title: string; artists: string }>;
}): Promise<MasterJourneyFacts> {
  const supabase = await createClient();
  const ids = project.masters.map((m) => m.id);
  const none = Promise.resolve({ data: [], error: null });
  const [
    files,
    sources,
    brief,
    creatives,
    transmissions,
    versions,
    received,
    messages,
    questions,
    exchanges,
    plan,
    rates,
    invoices,
  ] = await Promise.all([
    ids.length
      ? supabase
          .from("master_files")
          .select("id, master_id, file_name, audio_state, created_at")
          .in("master_id", ids)
          .eq("category", "audio")
          .order("created_at", { ascending: false })
          .limit(500)
      : none,
    supabase
      .from("master_flow_sources")
      .select(
        "master_id, file_id, created_at, vocals_final, vocals_pending, plan, file:master_files!master_flow_sources_file_id_fkey(file_name), confirmer:people!master_flow_sources_created_by_fkey(first_name, last_name)",
      )
      .eq("project_id", project.id)
      .order("created_at", { ascending: false }),
    // The brief, the sendings and the versions: shared with the step's own
    // loaders in the same render (lib/master-workflow/shared-rows.ts).
    masterBriefRow(project.id),
    listProjectCreatives(project.id),
    masterTransmissionRows(project.id),
    masterVersionRows(project.id),
    supabase
      .from("master_deliverables_received")
      .select(
        "master_id, deliverable, created_at, author:people!master_deliverables_received_created_by_fkey(first_name, last_name)",
      )
      .eq("project_id", project.id),
    supabase
      .from("master_engineer_messages")
      .select("stage, kind, status, created_at, escalated_at")
      .eq("project_id", project.id)
      .eq("author", "engineer"),
    supabase
      .from("master_brief_questions")
      .select(
        "asked_to, created_at, answered_at, applied_at, person:people!master_brief_questions_asked_to_fkey(first_name, last_name)",
      )
      .eq("project_id", project.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("master_brief_calls")
      .select(
        "call:calls!master_brief_calls_call_same_org(title, occurred_at, status)",
      )
      .eq("project_id", project.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("project_plan_items")
      .select("launched_at")
      .eq("project_id", project.id)
      .eq("workflow", "master")
      .not("launched_at", "is", null)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("budget_lines")
      .select("master_role, status")
      .eq("project_id", project.id)
      .not("master_role", "is", null),
    supabase
      .from("project_invoices")
      .select(
        "id, contact_id, requested_at, number, amount_cents, received_at, received_via, bank_changed, paid_on, paid_at, contact:network_contacts!project_invoices_contact_same_org(name), receiver:people!project_invoices_received_by_fkey(first_name, last_name), payer:people!project_invoices_paid_by_fkey(first_name, last_name)",
      )
      .eq("project_id", project.id)
      .eq("origin", "master")
      .order("requested_at"),
  ]);
  // Whether a new RIB waits, per engineer (never a digit): few rows, only
  // once an invoice was received with a new RIB.
  const pendingOf = new Map(
    await Promise.all(
      (invoices.data ?? [])
        .filter((i) => i.bank_changed && !i.paid_on)
        .map((i) =>
          supabase
            .rpc("contact_bank_state", { p_contact_id: i.contact_id })
            .then(({ data }) => [i.id, data === "pending"] as const),
        ),
    ),
  );
  const errors = [
    files.error,
    sources.error,
    brief.error,
    transmissions.error,
    versions.error,
  ].filter(Boolean);
  if (errors.length)
    console.error("loadMasterJourneyFacts:", errors[0]?.message);

  const b = brief.data;
  const creative = creatives[0];
  return {
    titles: project.masters.map((m) => ({
      ...m,
      audio: (files.data ?? []).flatMap((f) => {
        const state = audioStateOf(f.audio_state);
        return f.master_id === m.id && state
          ? [
              {
                id: f.id,
                fileName: f.file_name,
                audioState: state,
                createdAt: f.created_at,
              },
            ]
          : [];
      }),
      sources: (sources.data ?? [])
        .filter((s) => s.master_id === m.id)
        .map((s) => ({
          fileId: s.file_id,
          fileName: s.file?.file_name ?? "",
          confirmedAt: s.created_at,
          confirmedBy: nameOf(s.confirmer),
          vocalsFinal: s.vocals_final,
          vocalsPending: s.vocals_pending,
          plan: s.plan === "wait" || s.plan === "anticipate" ? s.plan : null,
        })),
    })),
    brief: b
      ? {
          recordedAt: b.recorded_at,
          recordedBy: nameOf(b.recorder),
          contentChangedAt: b.content_changed_at,
          dirty: !b.recorded_at || b.content_changed_at > b.recorded_at,
          startMode: b.start_mode,
          hasDirection: Boolean(
            b.direction || b.references_text || b.constraints_text,
          ),
          createdAt: b.created_at,
          updatedAt: b.updated_at,
          updatedBy: nameOf(b.updater),
          validatorId: b.validator_person_id,
          validatorName: nameOf(b.validator),
          mixContact:
            b.mix_contact_id && b.mix
              ? { id: b.mix_contact_id, name: b.mix.name }
              : null,
          masteringSame: b.mastering_same_engineer,
          masteringContact:
            b.mastering_contact_id && b.mastering
              ? { id: b.mastering_contact_id, name: b.mastering.name }
              : null,
          deliverables: b.deliverables ?? [],
          masterFinalDue: b.master_final_due,
          mixPerson:
            b.mix_person_id && b.mixer
              ? { personId: b.mix_person_id, name: nameOf(b.mixer) ?? "" }
              : null,
          masteringPerson:
            b.mastering_person_id && b.masterer
              ? {
                  personId: b.mastering_person_id,
                  name: nameOf(b.masterer) ?? "",
                }
              : null,
          mixAssignedAt: b.mix_assigned_at,
          masteringAssignedAt: b.mastering_assigned_at,
        }
      : null,
    creative: creative
      ? { personId: creative.personId, name: creative.name }
      : null,
    transmissions: (transmissions.data ?? []).map((t) => ({
      id: t.id,
      role: t.role === "mastering" ? "mastering" : "mix",
      contactId: t.contact_id,
      contactName: t.contact?.name ?? "",
      createdAt: t.created_at,
      linkSentAt: t.link_sent_at,
      openedAt: t.opened_at,
      acknowledgedAt: t.acknowledged_at,
      deliveredAt: t.delivered_at,
      revokedAt: t.revoked_at,
      revokeReason: t.revoke_reason,
      expiresAt: t.expires_at,
      sentBy: nameOf(t.sender),
      continued: t.continues_id !== null,
    })),
    versions: (versions.data ?? []).map((v) => ({
      id: v.id,
      masterId: v.master_id,
      stage: v.stage === "mastering" ? "mastering" : "mix",
      number: v.number,
      fileName: v.file?.file_name ?? "",
      createdAt: v.created_at,
      createdBy: nameOf(v.author),
      feedbackSentAt: v.feedback_sent_at,
      decision:
        v.decision === "approved" ||
        v.decision === "changes_requested" ||
        v.decision === "reopened"
          ? v.decision
          : null,
      decidedAt: v.decided_at,
      decidedBy: nameOf(v.decider),
      reopenedAt: v.reopened_at,
      reopenReason: v.reopen_reason,
      sourceFileId: v.source_file_id,
      declared:
        v.decision === "approved" &&
        v.stage === "mix" &&
        v.decided_at === v.created_at,
    })),
    received: (received.data ?? []).map((r) => ({
      masterId: r.master_id,
      deliverable: r.deliverable,
      at: r.created_at,
      by: nameOf(r.author),
    })),
    messages: (messages.data ?? []).map((m) => ({
      stage: m.stage === "mastering" ? "mastering" : "mix",
      kind: m.kind,
      status: m.status,
      createdAt: m.created_at,
      escalatedAt: m.escalated_at,
    })),
    questions: (questions.data ?? []).map((q) => ({
      askedTo: q.asked_to,
      askedToName: nameOf(q.person),
      createdAt: q.created_at,
      answeredAt: q.answered_at,
      appliedAt: q.applied_at,
    })),
    exchanges: (exchanges.data ?? []).flatMap((e) =>
      e.call
        ? [
            {
              title: e.call.title,
              occurredAt: e.call.occurred_at,
              status: e.call.status,
            },
          ]
        : [],
    ),
    planLaunchedAt: plan.data?.launched_at ?? null,
    rates: (rates.data ?? []).flatMap((r) =>
      r.master_role === "mix" || r.master_role === "mastering"
        ? [{ stage: r.master_role, status: r.status }]
        : [],
    ),
    invoices: (invoices.data ?? []).map((i) => ({
      id: i.id,
      contactName: i.contact?.name ?? "",
      requestedAt: i.requested_at,
      number: i.number,
      amountCents: i.amount_cents,
      receivedAt: i.received_at,
      viaLink: i.received_via === "link",
      receivedBy: nameOf(i.receiver),
      bankChanged: i.bank_changed,
      bankPending: pendingOf.get(i.id) ?? false,
      paidOn: i.paid_on,
      paidAt: i.paid_at,
      paidBy: nameOf(i.payer),
    })),
    failed: errors.length > 0,
  };
}
