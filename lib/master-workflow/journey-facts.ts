import "server-only";

import { audioStateOf, type AudioState } from "@/lib/catalog/title-rules";
import { personName } from "@/lib/projects/types";
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
  decision: "approved" | "changes_requested" | null;
  decidedAt: string | null;
  decidedBy: string | null;
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
    updatedAt: string;
    updatedBy: string | null;
    createdAt: string;
    validatorId: string | null;
    validatorName: string | null;
    mixContact: { id: string; name: string } | null;
    masteringSame: boolean;
    masteringContact: { id: string; name: string } | null;
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
  failed: boolean;
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
    supabase
      .from("master_briefs")
      .select(
        "created_at, updated_at, validator_person_id, mix_contact_id, mastering_same_engineer, mastering_contact_id, deliverables, master_final_due, validator:people!master_briefs_validator_person_id_fkey(first_name, last_name), updater:people!master_briefs_updated_by_fkey(first_name, last_name), mix:network_contacts!master_briefs_mix_contact_same_org(name), mastering:network_contacts!master_briefs_mastering_contact_same_org(name)",
      )
      .eq("project_id", project.id)
      .maybeSingle(),
    supabase
      .from("project_creatives")
      .select(
        "person_id, person:people!project_creatives_person_id_fkey(first_name, last_name)",
      )
      .eq("project_id", project.id)
      .order("created_at")
      .limit(1),
    supabase
      .from("master_transmissions")
      .select(
        "id, role, contact_id, created_at, link_sent_at, opened_at, acknowledged_at, delivered_at, revoked_at, revoke_reason, expires_at, continues_id, contact:network_contacts!master_transmissions_contact_same_org(name), sender:people!master_transmissions_created_by_fkey(first_name, last_name)",
      )
      .eq("project_id", project.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("master_mix_versions")
      .select(
        "id, master_id, stage, number, created_at, feedback_sent_at, decision, decided_at, file:master_files!master_mix_versions_file_id_fkey(file_name), author:people!master_mix_versions_created_by_fkey(first_name, last_name), decider:people!master_mix_versions_decided_by_fkey(first_name, last_name)",
      )
      .eq("project_id", project.id)
      .order("number", { ascending: false }),
    supabase
      .from("master_deliverables_received")
      .select(
        "master_id, deliverable, created_at, author:people!master_deliverables_received_created_by_fkey(first_name, last_name)",
      )
      .eq("project_id", project.id),
    supabase
      .from("master_engineer_messages")
      .select("stage, kind, status, created_at")
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
  ]);
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
  const creative = creatives.data?.[0];
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
        }
      : null,
    creative: creative
      ? { personId: creative.person_id, name: nameOf(creative.person) ?? "" }
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
        v.decision === "approved" || v.decision === "changes_requested"
          ? v.decision
          : null,
      decidedAt: v.decided_at,
      decidedBy: nameOf(v.decider),
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
    failed: errors.length > 0,
  };
}
