import "server-only";

import { cache } from "react";

import { requireApproved } from "@/lib/auth/dal";
import { loadBudget } from "@/lib/budget/queries";
import { loadMembers } from "@/lib/framing/related";
import { todayInParis } from "@/lib/insights/dates";
import { isWorkflowLaunched, planLaunchedAt } from "@/lib/plan/queries";
import { canEditProject } from "@/lib/projects/edit-access";
import { getProject } from "@/lib/projects/queries";
import { personName } from "@/lib/projects/types";
import { byProjectVersion } from "@/lib/projects/version-cache";
import { strategyModel } from "@/lib/strategy/dimension-model";
import { approvedOf, latestOf, sentOf } from "@/lib/strategy/documents/model";
import { loadStrategyDocuments } from "@/lib/strategy/documents/queries";
import {
  strategyJourney,
  type StrategyValidator,
} from "@/lib/strategy/journey";
import { loadStrategy } from "@/lib/strategy/queries";
import {
  loadDimensionSources,
  loadItemSources,
  loadStrategyCall,
  sourcedItemIds,
} from "@/lib/strategy/step-sources";
import { upstreamChains } from "@/lib/strategy/upstream";
import { allInOrder } from "@/lib/utils/parallel";

/**
 * Everything the four steps of the Stratégie share, read once per request:
 * access, the project, the strategy (loadStrategy), its budget, the
 * exchange, the Brief's versions, the lines of « Les 8 dimensions » and
 * the journey for the person looking. Null when the project cannot be read
 * or is not launched.
 *
 * Kept per project version (page loads audit, docs/ARCHITECTURE.md § 3 bis):
 * the result is plain data (no function), so byProjectVersion keeps it.
 */
export const strategyStepData = cache(
  byProjectVersion("strategy-context", readStrategyStepData),
);

async function readStrategyStepData(projectId: string) {
  const [access, project] = await allInOrder([
    requireApproved(),
    getProject(projectId),
  ]);
  if (!project || project.stages.length === 0) return null;
  // The documents only need the members (loadStrategy's `members` is the
  // same cached loadMembers list) and the sources' labels only the sources:
  // both start with the first wave instead of after it.
  const sourcesRead = loadDimensionSources(projectId);
  const [data, budget, launched, launchedAt, call, sources, docs, itemSources] =
    await Promise.all([
      loadStrategy(projectId, access),
      loadBudget(projectId),
      isWorkflowLaunched(projectId, "strategy"),
      planLaunchedAt(projectId),
      loadStrategyCall(projectId),
      sourcesRead,
      loadMembers(access).then((members) =>
        loadStrategyDocuments(projectId, members),
      ),
      sourcesRead.then((s) => loadItemSources(projectId, sourcedItemIds(s))),
    ]);
  if (!data) return null;

  const names = new Map(data.members.map((m) => [m.personId, m.name]));
  const name = (id: string | null) => (id ? (names.get(id) ?? null) : null);
  const today = todayInParis();
  const late = upstreamChains(
    data.milestones.map((m) => ({
      id: m.id,
      title: m.title,
      occursOn: m.occurs_on,
      deliverableId: m.deliverable_id,
    })),
    data.deliverables,
    today,
  ).flatMap((c) => c.steps.filter((s) => s.late)).length;
  const needs = new Map(
    [...data.openNeeds, ...data.legalNeeds].map((n) => [n.id, n.label]),
  );
  const leverNeeds = new Map(
    data.levers.map((l) => [l.need_id, l.needLabel] as const),
  );
  const model = strategyModel({
    fieldRows: sources.fieldRows,
    proposals: sources.proposals,
    levers: sources.levers,
    openNeeds: data.openNeeds,
    needLabel: (id) =>
      id ? (leverNeeds.get(id) ?? needs.get(id) ?? null) : null,
    audiences: data.audiences,
    deliverables: data.deliverables,
    milestones: data.milestones,
    objectives: data.objectives,
    budgetLines: budget.lines,
    envelopeCents: project.budgetCents,
    envelopeToConfirm: data.envelopeToConfirm,
    referenceDate: data.referenceDate,
    lateUpstream: late,
    today,
    legalDependencies: data.legalDependencies,
    ctx: {
      name,
      sourceOf: (id) => (id ? (itemSources.get(id) ?? null) : null),
    },
  });

  const viewer = (personId: string | null) =>
    personId !== null && personId === access.personId;
  const latest = latestOf(docs.documents, "brief");
  const inFlight = sentOf(docs.documents, "brief") ?? latest;
  const reviewers = inFlight?.reviews ?? [];
  const director = data.validators[0] ?? null;
  const validators: StrategyValidator[] =
    reviewers.length > 0
      ? reviewers.map((r) => ({
          personId: r.personId,
          name: r.name,
          viewer: viewer(r.personId),
          viaLink: false,
          role: data.validators.some((v) => v.personId === r.personId)
            ? "direction"
            : "creative",
        }))
      : [
          ...(director ? [{ ...director, role: "direction" as const }] : []),
          ...docs.creatives
            .filter((c) => c.personId !== director?.personId)
            .map((c) => ({ ...c, role: "creative" as const })),
        ].map((v) => ({ ...v, viewer: viewer(v.personId), viaLink: false }));
  const approved = approvedOf(docs.documents, "brief");
  const stage = data.stage?.state ?? "not_started";
  const docState = (kind: "release_plan" | "press_kit") =>
    latestOf(docs.documents, kind)?.state ?? "to_generate";

  const steps = strategyJourney({
    projectId,
    owner: project.ownerPersonId
      ? {
          name: project.ownerName ?? "—",
          viewer: viewer(project.ownerPersonId),
          viaLink: false,
        }
      : null,
    validators,
    plan: { launched, at: launchedAt },
    stage,
    started: data.started,
    call: call ? { occurredAt: call.occurredAt, held: call.reported } : null,
    dims: {
      ready: model.ready,
      pending: model.pending,
      confirmed: model.confirmed,
      firstToDecide: model.firstToDecide,
      firstToComplete: model.firstToComplete,
    },
    brief: latest
      ? {
          version: latest.version,
          state: latest.state,
          waiting: latest.reviews
            .filter((r) => r.state === "pending")
            .map((r) => ({
              name: r.name,
              viewer: viewer(r.personId),
              viaLink: false,
            })),
        }
      : null,
    approved: approved ? { version: approved.version } : null,
    revisionOpen: docs.revisionOpen,
    documents: { plan: docState("release_plan"), press: docState("press_kit") },
  });

  return {
    access,
    project,
    data,
    budget,
    call,
    sources,
    docs,
    model,
    steps,
    validators,
    approved,
    latest,
    stage,
    today,
    // The owner writes while the strategy is open (strategy_is_editable).
    canEdit:
      canEditProject(access, project) &&
      !sentOf(docs.documents, "brief") &&
      (stage === "in_progress" || (stage === "validated" && docs.revisionOpen)),
    isOwner: canEditProject(access, project),
    viewerName:
      personName(access.firstName ?? "", access.lastName ?? "") || null,
  };
}

export type StrategyStepData = NonNullable<
  Awaited<ReturnType<typeof strategyStepData>>
>;
