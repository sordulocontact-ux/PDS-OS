import "server-only";

import type { Access } from "@/lib/auth/access";
import { loadMembers } from "@/lib/framing/related";
import {
  isActivationKind,
  isActivationStatus,
  isAvailability,
  isEvidenceKind,
  isVerification,
  type Activation,
  type Evidence,
} from "@/lib/marketing/model";
import {
  reviewMetricName,
  reviewSourceName,
} from "@/lib/marketing/review-labels";
import { createClient } from "@/lib/supabase/server";

type ActivationOption = { id: string; label: string };

export type MarketingData = {
  activations: Activation[];
  evidence: Evidence[];
  members: { personId: string; name: string }[];
  canContribute: boolean;
  // Closed: read under control — activations and reserves no longer move,
  // evidence and follow-ups go on.
  marketingClosed: boolean;
};

const ACTIVATION_COLUMNS =
  "id, title, kind, status, owner_person_id, deliverable_id, lever_id, starts_on, ends_on, note, archived_at, created_at";
const EVIDENCE_COLUMNS =
  "id, activation_id, kind, label, url, platform, metric, value, unit, period_start, period_end, availability, reported_by, observed_on, verification, verified_at, verified_by, link_unreachable_at, archived_at, created_at";

/**
 * The project's activations and their evidence as the review groups them
 * (marketing_review_* views over the Activations' records), withdrawn
 * evidence included (the screen decides what to show), with the user's
 * session: RLS decides.
 */
export async function loadMarketing(
  projectId: string,
  access: Access,
): Promise<MarketingData> {
  const supabase = await createClient();
  const [
    activationsRes,
    evidenceRes,
    deliverablesRes,
    leversRes,
    canRes,
    members,
    closedRes,
  ] = await Promise.all([
    supabase
      .from("marketing_review_activations")
      .select(ACTIVATION_COLUMNS)
      .eq("project_id", projectId)
      .order("created_at"),
    supabase
      .from("marketing_review_evidence")
      .select(EVIDENCE_COLUMNS)
      .eq("project_id", projectId)
      .order("created_at"),
    supabase
      .from("strategy_deliverables")
      .select("id, title")
      .eq("project_id", projectId)
      .order("created_at"),
    supabase
      .from("levers")
      .select("id, label")
      .eq("project_id", projectId)
      .eq("state", "selected")
      .neq("review_status", "rejected")
      .order("created_at"),
    supabase.rpc("marketing_can_contribute", { p_project_id: projectId }),
    loadMembers(access),
    supabase.rpc("marketing_is_closed", { p_project_id: projectId }),
  ]);
  const nameOf = (id: string | null) =>
    id ? (members.find((m) => m.personId === id)?.name ?? null) : null;
  const deliverables = (deliverablesRes.data ?? []).map((d) => ({
    id: d.id,
    label: d.title,
  }));
  const levers = (leversRes.data ?? []).map((l) => ({
    id: l.id,
    label: l.label,
  }));
  const labelOf = (list: ActivationOption[], id: string | null) =>
    id ? (list.find((o) => o.id === id)?.label ?? null) : null;

  const activations: Activation[] = (activationsRes.data ?? []).flatMap((a) =>
    a.id &&
    a.title &&
    a.created_at &&
    isActivationKind(a.kind) &&
    isActivationStatus(a.status)
      ? [
          {
            id: a.id,
            title: a.title,
            kind: a.kind,
            status: a.status,
            ownerPersonId: a.owner_person_id,
            ownerName: nameOf(a.owner_person_id),
            deliverableId: a.deliverable_id,
            deliverableTitle: labelOf(deliverables, a.deliverable_id),
            leverId: a.lever_id,
            leverLabel: labelOf(levers, a.lever_id),
            startsOn: a.starts_on,
            endsOn: a.ends_on,
            note: a.note,
            archivedAt: a.archived_at,
            createdAt: a.created_at,
          },
        ]
      : [],
  );
  const evidence: Evidence[] = (evidenceRes.data ?? []).flatMap((e) =>
    e.id &&
    e.activation_id &&
    e.label &&
    e.created_at &&
    isEvidenceKind(e.kind) &&
    isVerification(e.verification)
      ? [
          {
            id: e.id,
            activationId: e.activation_id,
            kind: e.kind,
            label: e.label,
            url: e.url,
            platform: e.platform,
            metric: reviewMetricName(e.metric, e.unit),
            value: e.value === null ? null : Number(e.value),
            unit: e.unit,
            periodStart: e.period_start,
            periodEnd: e.period_end,
            availability: isAvailability(e.availability)
              ? e.availability
              : null,
            reportedBy: reviewSourceName(e.kind, e.reported_by),
            observedOn: e.observed_on,
            verification: e.verification,
            verifiedAt: e.verified_at,
            verifiedByName: nameOf(e.verified_by),
            linkUnreachableAt: e.link_unreachable_at,
            archivedAt: e.archived_at,
            createdAt: e.created_at,
          },
        ]
      : [],
  );
  return {
    activations,
    evidence,
    members,
    canContribute: canRes.data === true,
    marketingClosed: closedRes.data === true,
  };
}

export type MarketingEvent = {
  id: string;
  kind: string;
  subjectId: string | null;
  activationId: string | null;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  reason: string | null;
  actorName: string | null;
  createdAt: string;
};

/** The audit of the Marketing's follow-up, newest first. */
export async function loadMarketingEvents(
  projectId: string,
  access: Access,
  filter?: { activationId?: string; limit?: number },
): Promise<MarketingEvent[]> {
  const supabase = await createClient();
  let query = supabase
    .from("marketing_events")
    .select(
      "id, kind, subject_id, activation_id, old_value, new_value, reason, actor, created_at",
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(filter?.limit ?? 200);
  if (filter?.activationId)
    query = query.eq("activation_id", filter.activationId);
  const [{ data }, members] = await Promise.all([query, loadMembers(access)]);
  const asObject = (v: unknown) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? (v as Record<string, unknown>)
      : null;
  return (data ?? []).map((e) => ({
    id: e.id,
    kind: e.kind,
    subjectId: e.subject_id,
    activationId: e.activation_id,
    oldValue: asObject(e.old_value),
    newValue: asObject(e.new_value),
    reason: e.reason,
    actorName: members.find((m) => m.personId === e.actor)?.name ?? null,
    createdAt: e.created_at,
  }));
}
