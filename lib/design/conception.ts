import "server-only";

import type { Access } from "@/lib/auth/access";
import {
  deliverableFormat,
  type DeliverableFormat,
} from "@/lib/design/formats";
import { NARRATIVE_PARTS, type NarrativePart } from "@/lib/framing/brief";
import { loadMembers } from "@/lib/framing/related";
import {
  isDeliverableOrigin,
  isDesignTopic,
  type DeliverableOrigin,
  type DeliverableStatus,
  type DesignTopic,
  type IntentionSourceType,
  type IntentionStatus,
  type IntentionTarget,
} from "@/lib/design/intentions";
import { toIntentionChoices } from "@/lib/design/intention-choices";
import {
  referenceTypeOf,
  referenceUsageOf,
  type ReferenceType,
  type ReferenceUsage,
} from "@/lib/design/reference-kinds";
import { todayInParis } from "@/lib/insights/dates";
import type { ProjectDetail } from "@/lib/projects/types";
import { referenceDate } from "@/lib/strategy/calendar";
import type { ChoiceValue } from "@/lib/ui/choice-value";
import { listProjectCreatives } from "@/lib/projects/creatives";
import { deliverableTitle } from "@/lib/strategy/deliverable-title";
import { upstreamChains, type UpstreamStep } from "@/lib/strategy/upstream";
import { createClient } from "@/lib/supabase/server";

/** One deliverable of the Conception, engaged or still to qualify. */
export type ConceptionDeliverable = {
  // design_deliverables.id: what every Conception row points at.
  id: string;
  strategyDeliverableId: string | null;
  title: string;
  origin: DeliverableOrigin;
  status: DeliverableStatus;
  // The lever it answers (committed deliverable, or decision of Stratégie).
  leverLabel: string | null;
  leverFamily: string | null;
  // The call it was decided in (decision of call).
  callId: string | null;
  callTitle: string | null;
  note: string | null;
  dueDate: string | null;
  assigneeName: string | null;
  // The first milestone it comes out on, and the deadlines counted back
  // from it by code (lib/strategy/upstream.ts).
  milestone: { title: string; date: string } | null;
  upstream: UpstreamStep[];
  // Topics with a confirmed intention of its own, PO's proposals waiting.
  answered: number;
  proposals: number;
  // Topics it has no answer of its own for but inherits from the confirmed
  // direction of the release (MKT-C2-06): answered + inherited = complete.
  inherited: number;
  // What it is (clip, cover, short video, campaign…): its questions follow.
  format: DeliverableFormat;
  // The format written by the Stratégie or with a late addition
  // (« 16:9, 4 min »), as typed; the quantity committed.
  formatText: string | null;
  quantity: number;
  // Who added it (a late addition's « par … »).
  createdBy: string | null;
};

export type ConceptionIntention = {
  id: string;
  target: IntentionTarget;
  deliverableId: string | null;
  topic: DesignTopic;
  value: string;
  // The choices checked to write it (empty for a proposal of PO).
  choices: ChoiceValue;
  status: Exclude<IntentionStatus, "rejected">;
  sourceType: IntentionSourceType;
  sourceId: string | null;
  sourceQuote: string | null;
  createdAt: string;
};

export type ConceptionSource = {
  id: string;
  kind: "call" | "import";
  title: string;
  callId: string | null;
  createdAt: string;
};

export type ConceptionReference = {
  id: string;
  // MKT-C2-09: reference, moodboard, or gathered before the rule.
  type: ReferenceType;
  usage: ReferenceUsage | null;
  // The moodboard it sits in, if any.
  moodboardId: string | null;
  // link = an https address; file = a file in the design-references bucket.
  kind: "link" | "file";
  title: string | null;
  url: string | null;
  path: string | null;
  fileName: string | null;
  mime: string | null;
  bytes: number | null;
  // The targets it serves (one resource, any number of links); none = à rattacher.
  links: Array<{
    target: "direction" | "deliverable";
    deliverableId: string | null;
  }>;
  note: string | null;
  createdBy: string | null;
  createdAt: string;
};

/** What the Stratégie and the Cadrage already say, shown, never asked. */
export type ConceptionKnown = {
  audiences: string | null;
  narrative: string | null;
  // The confirmed story parts of the narrative, by key.
  narrativeParts: Array<{ key: NarrativePart; value: string }>;
  constraints: Array<{ type: string; text: string }>;
  releaseDate: string | null;
};

export type ConceptionData = {
  organizationId: string;
  stage: { id: string; state: string } | null;
  strategyState: string;
  // The owner opened the work (« Commencer directement », or a creative call
  // processed): the entry offers to resume it.
  started: boolean;
  isOwner: boolean;
  // Mirrors design_can_write (SQL): the owner, the creative team or a
  // designated responsible, while
  // the Conception is in progress.
  canWrite: boolean;
  // Mirrors design_is_open + owner: a deliverable or a call can be added.
  canAdd: boolean;
  deliverables: ConceptionDeliverable[];
  intentions: ConceptionIntention[];
  sources: ConceptionSource[];
  references: ConceptionReference[];
  known: ConceptionKnown;
  // For « Ajouter un livrable »: the retained levers and the project's calls.
  levers: Array<{ id: string; label: string }>;
  calls: Array<{ id: string; title: string; occurredAt: string }>;
  callReportCount: number;
};

/** Everything the Conception shows, read with the user's session (RLS). */
export async function loadConception(
  project: Pick<ProjectDetail, "id" | "ownerPersonId" | "dueDate" | "stages">,
  access: Access,
): Promise<ConceptionData | null> {
  const supabase = await createClient();
  const projectId = project.id;
  const [
    orgRes,
    deliverablesRes,
    intentionsRes,
    sourcesRes,
    referencesRes,
    fieldsRes,
    constraintsRes,
    milestonesRes,
    releaseRes,
    leversRes,
    callsRes,
    workspaceRes,
    creatives,
    reportCountRes,
    members,
    responsibleRes,
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("organization_id")
      .eq("id", projectId)
      .maybeSingle(),
    supabase
      .from("design_deliverables")
      .select(
        "id, strategy_deliverable_id, title, origin, status, note, call_id, format, created_by, created_at, strategy_deliverables(title, quantity, due_date, format, assignee_person_id, levers(label, family)), levers(label, family), calls(title)",
      )
      .eq("project_id", projectId)
      .order("created_at"),
    supabase
      .from("design_intentions")
      .select(
        "id, target, design_deliverable_id, topic, value, choices, status, source_type, source_id, source_quote, created_at",
      )
      .eq("project_id", projectId)
      .in("status", ["proposed", "confirmed"])
      .order("created_at"),
    supabase
      .from("design_sources")
      .select("id, kind, title, call_id, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false }),
    supabase
      .from("design_references")
      .select(
        "id, kind, title, url, path, file_name, mime, bytes, note, type, usage, moodboard_id, created_by, created_at, design_reference_links(target, design_deliverable_id)",
      )
      .eq("project_id", projectId)
      .order("created_at"),
    supabase
      .from("current_field_values")
      .select("field_key, value, status")
      .eq("project_id", projectId)
      .eq("deliverable", "strategy")
      .eq("status", "confirmed"),
    supabase
      .from("framing_constraints")
      .select("type, text")
      .eq("project_id", projectId)
      .eq("review_status", "confirmed")
      .order("created_at"),
    supabase
      .from("milestones")
      .select("id, title, occurs_on, deliverable_id")
      .eq("project_id", projectId)
      .order("occurs_on"),
    supabase
      .from("releases")
      .select("planned_release_date")
      .eq("project_id", projectId)
      .order("created_at")
      .limit(1)
      .maybeSingle(),
    supabase
      .from("levers")
      .select("id, label")
      .eq("project_id", projectId)
      .eq("state", "selected")
      .eq("review_status", "confirmed")
      .order("created_at"),
    supabase
      .from("calls")
      .select("id, title, occurred_at")
      .eq("project_id", projectId)
      .order("occurred_at", { ascending: false }),
    supabase
      .from("design_workspaces")
      .select("project_id")
      .eq("project_id", projectId)
      .maybeSingle(),
    listProjectCreatives(projectId),
    supabase
      .from("call_reports")
      .select("id, calls!inner(project_id)", { count: "exact", head: true })
      .eq("calls.project_id", projectId),
    loadMembers(access),
    // A designated responsible (direction or a sheet) writes too.
    supabase.rpc("design_is_responsible", { p_project_id: projectId }),
  ]);
  if (!orgRes.data) return null;

  const stageOf = (key: string) => project.stages.find((s) => s.key === key);
  const designStage = stageOf("design");
  const stage = designStage
    ? { id: designStage.id, state: designStage.state }
    : null;
  const strategyState = stageOf("launch_strategy")?.state ?? "not_started";
  const me = access.personId;
  const isOwner = me !== null && project.ownerPersonId === me;
  const isCreative = creatives.some((c) => c.personId === me);
  const inProgress = stage?.state === "in_progress";
  const open =
    strategyState === "validated" &&
    (stage?.state === "not_started" || stage?.state === "in_progress");

  const intentions: ConceptionIntention[] = (intentionsRes.data ?? []).flatMap(
    (row) =>
      isDesignTopic(row.topic) &&
      (row.status === "proposed" || row.status === "confirmed")
        ? [
            {
              id: row.id,
              target: row.target as IntentionTarget,
              deliverableId: row.design_deliverable_id,
              topic: row.topic,
              value: row.value,
              choices: toIntentionChoices(row.topic, row.choices),
              status: row.status,
              sourceType: row.source_type as IntentionSourceType,
              sourceId: row.source_id,
              sourceQuote: row.source_quote,
              createdAt: row.created_at,
            },
          ]
        : [],
  );

  const nameOf = new Map(members.map((m) => [m.personId, m.name]));
  const milestones = (milestonesRes.data ?? []).map((m) => ({
    id: m.id,
    title: m.title,
    occursOn: m.occurs_on,
    deliverableId: m.deliverable_id,
  }));
  const rows = deliverablesRes.data ?? [];
  const chains = upstreamChains(
    milestones,
    rows.flatMap((d) =>
      d.strategy_deliverable_id
        ? [
            {
              id: d.strategy_deliverable_id,
              title: d.strategy_deliverables?.title ?? "",
            },
          ]
        : [],
    ),
    todayInParis(),
  );

  // The topics the release's direction answers: every deliverable inherits
  // them unless it answers them itself (MKT-C2-06).
  const directionTopics = new Set(
    intentions
      .filter((i) => i.target === "direction" && i.status === "confirmed")
      .map((i) => i.topic),
  );
  const deliverables: ConceptionDeliverable[] = rows.flatMap((d) => {
    if (!isDeliverableOrigin(d.origin)) return [];
    const committed = d.strategy_deliverables;
    const lever = committed?.levers ?? d.levers;
    const chain = chains.find(
      (c) => c.deliverableId === d.strategy_deliverable_id,
    );
    const own = intentions.filter(
      (i) => i.target === "deliverable" && i.deliverableId === d.id,
    );
    return [
      {
        id: d.id,
        strategyDeliverableId: d.strategy_deliverable_id,
        title: committed
          ? deliverableTitle(committed.title, committed.quantity)
          : (d.title ?? ""),
        origin: d.origin,
        status: d.status === "confirmed" ? "confirmed" : "to_qualify",
        leverLabel: lever?.label ?? null,
        leverFamily: lever?.family ?? null,
        callId: d.call_id,
        callTitle: d.calls?.title ?? null,
        note: d.note,
        dueDate: committed?.due_date ?? null,
        assigneeName: committed?.assignee_person_id
          ? (nameOf.get(committed.assignee_person_id) ?? null)
          : null,
        milestone: chain
          ? { title: chain.milestoneTitle, date: chain.milestoneDate }
          : null,
        upstream: chain?.steps ?? [],
        answered: own.filter((i) => i.status === "confirmed").length,
        proposals: own.filter((i) => i.status === "proposed").length,
        inherited: [...directionTopics].filter(
          (topic) =>
            !own.some((i) => i.status === "confirmed" && i.topic === topic),
        ).length,
        format: deliverableFormat(
          committed?.title ?? d.title ?? "",
          lever?.label ?? null,
        ),
        formatText: committed?.format ?? d.format ?? null,
        quantity: committed?.quantity ?? 1,
        createdBy: d.created_by,
      },
    ];
  });

  const fields = fieldsRes.data ?? [];
  const text = (key: string) => {
    const value = fields.find((f) => f.field_key === key)?.value;
    return typeof value === "string" && value.trim() ? value : null;
  };

  return {
    organizationId: orgRes.data.organization_id,
    stage,
    strategyState,
    started: Boolean(workspaceRes.data),
    isOwner,
    canWrite:
      inProgress && (isOwner || isCreative || responsibleRes.data === true),
    canAdd: open && isOwner,
    deliverables,
    intentions,
    sources: (sourcesRes.data ?? []).map((s) => ({
      id: s.id,
      kind: s.kind === "call" ? "call" : "import",
      title: s.title,
      callId: s.call_id,
      createdAt: s.created_at,
    })),
    references: (referencesRes.data ?? []).map((r) => ({
      id: r.id,
      kind: r.kind === "file" ? "file" : "link",
      type: referenceTypeOf(r.type),
      usage: referenceUsageOf(r.usage),
      moodboardId: r.moodboard_id,
      title: r.title,
      url: r.url,
      path: r.path,
      fileName: r.file_name,
      mime: r.mime,
      bytes: r.bytes,
      links: r.design_reference_links.map((l) => ({
        target: l.target === "deliverable" ? "deliverable" : "direction",
        deliverableId: l.design_deliverable_id,
      })),
      note: r.note,
      createdBy: r.created_by,
      createdAt: r.created_at,
    })),
    known: {
      audiences: text("audiences"),
      narrative: text("narrative"),
      narrativeParts: NARRATIVE_PARTS.flatMap((key) => {
        const value = text(key);
        return value ? [{ key, value }] : [];
      }),
      constraints: (constraintsRes.data ?? []).map((c) => ({
        type: c.type,
        text: c.text,
      })),
      releaseDate: referenceDate(
        releaseRes.data?.planned_release_date ?? null,
        project.dueDate,
      ),
    },
    levers: leversRes.data ?? [],
    calls: (callsRes.data ?? []).map((c) => ({
      id: c.id,
      title: c.title,
      occurredAt: c.occurred_at,
    })),
    callReportCount: reportCountRes.count ?? 0,
  };
}
