import "server-only";

import { cache } from "react";

import { stepText } from "@/lib/activations/describe";
import { resolveDependencies } from "@/lib/activations/dependencies";
import { loadActivationData } from "@/lib/activations/load";
import { loadModuleFacts, moduleSignals } from "@/lib/activations/modules";
import {
  alertsOf,
  isBlocked,
  measureState,
  proofState,
  reservesOf,
  ruleOrigin,
  ruleSteps,
  viewsOf,
  type ActivationFacts,
} from "@/lib/activations/states";
import type {
  ActivationRecord,
  ActivationSummary,
  DependencyRecord,
  NextAction,
} from "@/lib/activations/types";
import { todayInParis } from "@/lib/insights/dates";
import { createClient } from "@/lib/supabase/server";

type Data = Awaited<ReturnType<typeof loadActivationData>>;

const CLOSING_OUTCOMES = ["closed"];

function factsOf(
  a: ActivationRecord,
  data: Data,
  deps: DependencyRecord[],
): ActivationFacts {
  const targets = data.targets.filter((x) => x.activation_id === a.id);
  return {
    status: a.status,
    ownerPersonId: a.ownerPersonId,
    dueOn: a.dueOn,
    evidenceExpected: a.evidenceExpected,
    metricsExpected: a.metricsExpected,
    evidences: data.evidences
      .filter((e) => e.activationId === a.id)
      .map((e) => ({
        id: e.id,
        targetId: e.targetId,
        withdrawn: e.withdrawnAt !== null,
        lastCheck: e.checks[0]?.result ?? null,
      })),
    metrics: data.metrics
      .filter((m) => m.activationId === a.id)
      .map((m) => ({
        targetId: m.targetId,
        agencyRowId: m.agencyRowId,
        verification: m.verification,
        valid: m.invalidatedAt === null,
      })),
    liveTargetIds: targets
      .filter((x) => !x.outcome || CLOSING_OUTCOMES.includes(x.outcome))
      .map((x) => x.id),
    openTargetCount: targets.filter((x) => !x.outcome).length,
    openBlockers: data.blockers
      .filter((b) => b.activationId === a.id && b.status === "open")
      .map((b) => ({ id: b.id, description: b.description })),
    dependencies: deps.filter((d) => d.activationId === a.id),
  };
}

/** The next action: a person's open one first, else the first rule not set
 * aside. A rule already turned into a task says so. Nothing is created. */
function nextActionOf(
  a: ActivationRecord,
  data: Data,
  steps: ReturnType<typeof ruleSteps>,
): NextAction | null {
  const rows = data.nextActions.filter((n) => n.activation_id === a.id);
  const manual = rows.find((n) => n.origin === "manual" && n.status === "open");
  if (manual)
    return {
      origin: "manual",
      label: manual.label,
      reason: null,
      expectedPersonId: manual.expected_person_id,
      dueOn: manual.due_on,
      taskId: manual.task_id,
      rowId: manual.id,
      ruleKey: null,
    };
  for (const s of steps) {
    const origin = ruleOrigin(s.key);
    const acted = rows.find((n) => n.origin === origin);
    if (acted && acted.status !== "open") continue;
    const { label, reason } = stepText(s);
    return {
      origin,
      label: acted?.label ?? label,
      reason,
      expectedPersonId: acted?.expected_person_id ?? a.ownerPersonId,
      dueOn: acted?.due_on ?? null,
      taskId: acted?.task_id ?? null,
      rowId: acted?.id ?? null,
      ruleKey: s.key,
    };
  }
  return null;
}

/** Every activation of the project with its computed states. Cached per
 * request. */
export const loadActivationsBoard = cache(async (projectId: string) => {
  const [data, modules] = await Promise.all([
    loadActivationData(projectId),
    loadModuleFacts(projectId),
  ]);
  const [deps, sources] = await Promise.all([
    resolveDependencies(projectId, data.dependencies),
    loadSourceLabels(data.activations),
  ]);
  const today = todayInParis();

  const summaries: ActivationSummary[] = data.activations.map((a) => {
    const facts = factsOf(a, data, deps);
    const signals = moduleSignals(a, modules, today);
    const alerts = alertsOf(facts, today, signals.alerts);
    const steps = ruleSteps(facts, today, signals.steps);
    const changes = [
      a.updatedAt,
      ...data.evidences
        .filter((e) => e.activationId === a.id)
        .map((e) => e.createdAt),
    ].sort();
    return {
      ...a,
      sourceLabel: sources.get(a.id) ?? null,
      proof: proofState(facts),
      measure: measureState(facts),
      alerts,
      views: viewsOf(facts, alerts),
      blocked: isBlocked(facts, alerts),
      next: nextActionOf(a, data, steps),
      reserves: reservesOf(facts),
      openBlockerCount: facts.openBlockers.length,
      lastChangeAt: changes.at(-1) ?? a.updatedAt,
    };
  });
  return { summaries, data, dependencies: deps, modules };
});

/** The name of each activation's source, read where it lives. */
async function loadSourceLabels(activations: ActivationRecord[]) {
  const labels = new Map<string, string>();
  const ids = (key: "leverId" | "deliverableId" | "handoffId") =>
    activations.flatMap((a) => (a[key] ? [a[key] as string] : []));
  if (activations.every((a) => a.sourceKind === "manual")) return labels;
  const supabase = await createClient();
  const { data: handoffs } = await supabase
    .from("production_activation_handoffs")
    .select("id, deliverable_id")
    .in("id", ids("handoffId"));
  const [levers, deliverables] = await Promise.all([
    supabase.from("levers").select("id, label").in("id", ids("leverId")),
    supabase
      .from("strategy_deliverables")
      .select("id, title")
      .in("id", [
        ...ids("deliverableId"),
        ...(handoffs ?? []).map((h) => h.deliverable_id),
      ]),
  ]);
  const titleOf = (id: string | undefined) =>
    deliverables.data?.find((d) => d.id === id)?.title;
  for (const a of activations) {
    const label = a.leverId
      ? levers.data?.find((l) => l.id === a.leverId)?.label
      : a.deliverableId
        ? titleOf(a.deliverableId)
        : a.handoffId
          ? titleOf(handoffs?.find((h) => h.id === a.handoffId)?.deliverable_id)
          : undefined;
    if (label) labels.set(a.id, label);
  }
  return labels;
}
