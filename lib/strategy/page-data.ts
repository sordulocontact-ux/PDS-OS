import "server-only";

import { notFound } from "next/navigation";

import type { CallSheetData } from "@/components/framing/intel/framing-call-sheet";
import { requireApproved } from "@/lib/auth/dal";
import { nextRoundHourInput } from "@/lib/calls/format";
import { canEditProject } from "@/lib/projects/edit-access";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { assessStrategy } from "@/lib/strategy/assess";
import {
  strategyCallPurpose,
  strategyCallTopics,
} from "@/lib/strategy/call-prep";
import { loadStrategy } from "@/lib/strategy/queries";
import { loadStrategyContext } from "@/lib/strategy/workspace";
import { createClient } from "@/lib/supabase/server";
import { allInOrder } from "@/lib/utils/parallel";

/**
 * What every Strategy page reads, in one place: access, project, the
 * dimensions and their assessment, the documents, and what the person may do.
 */
export async function loadStrategyPage(projectId: string) {
  const [access, project] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
  ]);
  const data = await loadStrategy(projectId, access);
  if (!data) notFound();
  const ctx = await loadStrategyContext(projectId, data.members);
  const assessment = assessStrategy(data);
  const stage = data.stage?.state ?? "not_started";
  const canEdit = canEditProject(access, project);
  const sentBrief = ctx.documents.some(
    (d) => d.kind === "brief" && d.state === "sent",
  );
  // The database decides (strategy_is_editable); this only decides what is offered.
  const canWrite =
    canEdit &&
    !sentBrief &&
    (stage === "in_progress" || (stage === "validated" && ctx.revisionOpen));
  const hasContent =
    data.fields.some((f) => f.value) ||
    data.levers.length > 0 ||
    data.milestones.length > 0 ||
    data.deliverables.length > 0;
  const started =
    Boolean(ctx.startedAt) ||
    hasContent ||
    stage === "awaiting_validation" ||
    stage === "validated";
  return {
    access,
    project,
    data,
    ctx,
    assessment,
    stage,
    canEdit,
    canWrite,
    started,
  };
}

export type StrategyPageData = Awaited<ReturnType<typeof loadStrategyPage>>;

/** Committed deliverables with an approved version in the Conception. */
export async function readyDeliverableIds(
  projectId: string,
): Promise<Set<string>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("design_versions")
    .select("deliverable_id")
    .eq("project_id", projectId)
    .eq("status", "approved")
    .not("deliverable_id", "is", null);
  return new Set((data ?? []).flatMap((v) => v.deliverable_id ?? []));
}

/** What « Préparer un échange » opens with, prepared by code. */
export async function strategyCallSheet(
  page: StrategyPageData,
): Promise<CallSheetData> {
  const supabase = await createClient();
  const { data: files } = await supabase
    .from("project_files")
    .select("id, file_name")
    .eq("project_id", page.project.id)
    .order("created_at", { ascending: false })
    .limit(30);
  const topics = strategyCallTopics(page.assessment);
  return {
    topics,
    purpose: strategyCallPurpose(topics),
    people: [
      ...(page.project.ownerName ? [page.project.ownerName] : []),
      ...page.ctx.creatives.map((c) => c.name),
    ],
    documents: (files ?? []).map((f) => ({ id: f.id, name: f.file_name })),
    defaultOccurredAt: nextRoundHourInput(new Date()),
  };
}
