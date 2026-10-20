import "server-only";

import { cache } from "react";

import { moduleActions } from "@/lib/activations/actors";
import { collaborationsOf, derivedProof } from "@/lib/activations/campaign";
import { stepText } from "@/lib/activations/describe";
import { trunkAction, viewerFirst } from "@/lib/activations/journey";
import { isGated } from "@/lib/activations/phase";
import { loadActivationPeople } from "@/lib/activations/people";
import { loadPressKit } from "@/lib/activations/press-kit";
import { resolveDependencies } from "@/lib/activations/dependencies";
import { loadActivationData } from "@/lib/activations/load";
import { loadModuleFacts, moduleSignals } from "@/lib/activations/modules";
import {
  alertsOf,
  isBlocked,
  launchGaps,
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
import { fr } from "@/lib/i18n/fr";
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
    metricsUnavailable: a.metricsUnavailable,
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
        partial: m.partial,
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
  const [data, modules, people, kit] = await Promise.all([
    loadActivationData(projectId),
    loadModuleFacts(projectId),
    loadActivationPeople(projectId),
    loadPressKit(projectId),
  ]);
  const [deps, sources] = await Promise.all([
    resolveDependencies(projectId, data.dependencies),
    loadSourceLabels(data.activations),
  ]);
  const today = todayInParis();

  const summaries: ActivationSummary[] = data.activations.map((a) => {
    const derived = derivedProof(a, modules, data.evidences);
    const facts = { ...factsOf(a, data, deps), derivedProof: derived?.state };
    const signals = moduleSignals(a, modules, today);
    const alerts = alertsOf(facts, today, signals.alerts);
    const steps = ruleSteps(facts, today, signals.steps);
    const changes = [
      a.updatedAt,
      ...data.evidences
        .filter((e) => e.activationId === a.id)
        .map((e) => e.createdAt),
    ].sort();
    const proof = proofState(facts);
    const measure = measureState(facts);
    const gaps = launchGaps(facts);
    const owner = a.ownerPersonId ? people.person(a.ownerPersonId) : null;
    const trunk = trunkAction(
      { ...a, launchGaps: gaps, proof, measure, derivedProof: !!derived },
      { owner, projectOwner: people.projectOwner, direction: people.direction },
    );
    const lines = moduleActions(a, {
      m: modules,
      evidences: data.evidences,
      collabs:
        a.kind === "influence" && a.mode === "internal"
          ? collaborationsOf(a.id, modules, data.evidences)
          : [],
      people: {
        owner: owner ?? people.projectOwner,
        direction: people.direction,
        creative: people.creative,
      },
      kit: {
        approved: kit.approved !== null,
        state: kit.latest?.state ?? null,
      },
    });
    const gated = isGated({ ...a, launchGaps: gaps, proof, measure });
    return {
      ...a,
      sourceLabel: sources.get(a.id) ?? null,
      derived,
      actions: viewerFirst([...(trunk ? [trunk] : []), ...lines]),
      waitsFor: gated ? waitsForOf(facts) : null,
      lastFigure: lastFigureOf(a, data),
      proof,
      measure,
      alerts,
      views: viewsOf(facts, alerts),
      blocked: isBlocked(facts, alerts),
      next: nextActionOf(a, data, steps),
      reserves: reservesOf(facts),
      openBlockerCount: facts.openBlockers.length,
      launchGaps: gaps,
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

const count = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

/** The latest valid statistic of an activation, in its unit. */
function lastFigureOf(a: ActivationRecord, data: Data): string | null {
  const m = data.metrics.find(
    (x) =>
      x.activationId === a.id &&
      x.invalidatedAt === null &&
      x.targetId === null &&
      x.unit === "count",
  );
  return m
    ? `${count.format(m.value)} ${fr.activationJourney.units[a.kind]}`
    : null;
}

/** What a gated activation waits for, said like the proto (« Clip officiel
 * livré »): a deliverable by its title, else the blocker or dependency. */
function waitsForOf(facts: ActivationFacts): string | null {
  const t = fr.activationJourney.detail;
  const items = [
    ...facts.dependencies
      .filter((d) => d.blocking && d.resolved === false)
      .map((d) => {
        const title = /«\s*(.+?)\s*»/.exec(d.label)?.[1];
        return d.kind === "deliverable" && title
          ? t.deliveredShort(title)
          : d.label;
      }),
    ...facts.openBlockers.map((b) => b.description),
  ];
  return items.join(" · ") || null;
}
