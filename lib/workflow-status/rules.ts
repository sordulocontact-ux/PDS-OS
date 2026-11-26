// The common status of each workflow of a project (ticket « Architecture
// globale », 08/10/2026, § 8): Non démarré, En cours, En attente, Bloqué,
// Terminé — each with its reason and the step it comes from, so it stays
// traceable to its source. Computed by code from facts read in the existing
// tables (lib/workflow-status/load.ts), never stored, never written by PO
// (rule 6). Pure: every rule here is unit-tested.

import { marketingReview } from "@/lib/i18n/fr/marketing-review";
import { shell } from "@/lib/i18n/fr/shell";
import { workflowStatus } from "@/lib/i18n/fr/workflow-status";
import {
  isMarketingClosed,
  type MarketingStatus,
} from "@/lib/marketing/closure/status";
import type { MasterTab } from "@/lib/ui/master-steps";
import { workflowStepHref } from "@/lib/ui/workflow-hrefs";

const fr = { shell, marketingReview, workflowStatus };

export const WORKFLOWS = [
  "master",
  "legal",
  "marketing",
  "distribution",
] as const;
export type WorkflowKey = (typeof WORKFLOWS)[number];

export const COMMON_STATUSES = [
  "not_started",
  "in_progress",
  "waiting",
  "blocked",
  "done",
] as const;
export type CommonStatus = (typeof COMMON_STATUSES)[number];

export type WorkflowState = {
  workflow: WorkflowKey;
  status: CommonStatus;
  // The chevron the workflow stands on (its key in the workflow's steps).
  step: string;
  // Why it has this status, in words.
  reason: string;
  // Its progress in business units (titles, actions, steps).
  progress: string;
  // The chevrons really done.
  done: string[];
};

/** Which workflows a project has, from its data (ticket § 13): the Master
 * needs titles, the Distribution is a music release's — and a collective's
 * whatever its type, release by release (décision 9, lot 15). */
export function applicableWorkflows(project: {
  type: string;
  masterCount: number;
  collective?: boolean;
}): WorkflowKey[] {
  return WORKFLOWS.filter((workflow) =>
    workflow === "master"
      ? project.masterCount > 0
      : workflow === "distribution"
        ? project.type === "music_release" || project.collective === true
        : true,
  );
}

// ---------------------------------------------------------------- Master

/** One round (mix or mastering): per title, its latest version. */
export type RoundFacts = {
  // Titles the round concerns (those without a master final yet, for the mix).
  titles: number;
  // Titles whose version was validated: the round's result.
  finals: number;
  // The package was sent, and acknowledged by the engineer.
  sent: boolean;
  acknowledged: boolean;
  // Per title still open, its latest version (null: none yet).
  open: Array<{ number: number; decision: "changes_requested" | null } | null>;
};

export type MasterFacts = {
  launched: boolean;
  titles: number;
  prepare: {
    sources: number;
    sourcesTotal: number;
    brief: boolean;
    sent: boolean;
  };
  mix: RoundFacts;
  mastering: RoundFacts;
  deliverables: { expected: number; received: number };
  validator: string | null;
  mixEngineer: string | null;
  masteringEngineer: string | null;
  // A collective's live titles still without any audio (« Titre de Jay (à
  // nommer) »): the Master is not done while one is left.
  withoutAudio?: number;
};

function roundState(
  round: RoundFacts,
  engineer: string | null,
  validator: string | null,
  sendReason: string,
): { status: CommonStatus; reason: string } {
  const t = fr.workflowStatus.master;
  if (!round.sent) return { status: "in_progress", reason: sendReason };
  const pending = round.open.filter(
    (version) => version !== null && version.decision === null,
  );
  if (pending.length > 0) {
    const numbers = pending.map((version) => `V${version!.number}`);
    return {
      status: "waiting",
      reason: t.decide(numbers.join(", "), validator),
    };
  }
  if (!round.acknowledged)
    return { status: "waiting", reason: t.acknowledge(engineer) };
  if (round.open.some((version) => version === null))
    return { status: "waiting", reason: t.firstVersion(engineer) };
  return { status: "waiting", reason: t.newVersion(engineer) };
}

const mixDone = (facts: MasterFacts) =>
  facts.mix.titles === 0 || facts.mix.finals >= facts.mix.titles;

/** Every title has its master final, through the workflow or before it:
 * what going online waits for, launched or not. */
export const mastersFinal = (facts: MasterFacts) =>
  mixDone(facts) &&
  (facts.mastering.titles === 0 ||
    facts.mastering.finals >= facts.mastering.titles);

export function masterState(facts: MasterFacts): WorkflowState {
  const t = fr.workflowStatus.master;
  const base = { workflow: "master" as const };
  const p = facts.prepare;
  const sourced = p.sources === p.sourcesTotal;
  const prepared = sourced && p.brief && p.sent;
  const masterDone = mastersFinal(facts);
  const delivered =
    masterDone && facts.deliverables.received >= facts.deliverables.expected;
  // A collective's titles without any audio: their source is still to come.
  const silent = facts.withoutAudio ?? 0;
  // Nothing is done in a workflow not launched, or without titles: titles
  // already at their master final must not tick its chevrons beforehand.
  const started = facts.launched && facts.titles > 0;
  const done: MasterTab[] = !started
    ? []
    : [
        ...(sourced && silent === 0 ? (["source"] as const) : []),
        ...(p.brief ? (["brief"] as const) : []),
        ...(prepared && mixDone(facts) ? (["mixing"] as const) : []),
        ...(masterDone ? (["mastering"] as const) : []),
        ...(delivered && silent === 0 ? (["final"] as const) : []),
      ];
  const prepareCount = [sourced, p.brief, p.sent].filter(Boolean).length;

  if (!facts.launched)
    return {
      ...base,
      status: "not_started",
      step: "source",
      reason: fr.workflowStatus.notLaunched,
      progress:
        facts.mix.titles === 0
          ? t.progressAlreadyFinal(facts.titles)
          : t.progressPrepare(prepareCount),
      done,
    };
  if (facts.titles === 0)
    return {
      ...base,
      status: "not_started",
      step: "source",
      reason: silent > 0 ? t.withoutAudio(silent) : t.noTitle,
      progress: t.progressPrepare(0),
      done,
    };
  // Before the mix: the sources, then the Brief, then the sending, which
  // is done on the Mixage page (its step).
  if (!prepared)
    return {
      ...base,
      status: "in_progress",
      step: !sourced ? "source" : !p.brief ? "brief" : "mixing",
      reason: !sourced
        ? t.sources(p.sourcesTotal - p.sources)
        : !p.brief
          ? t.brief
          : t.send,
      progress: t.progressPrepare(prepareCount),
      done,
    };
  if (!mixDone(facts))
    return {
      ...base,
      ...roundState(facts.mix, facts.mixEngineer, facts.validator, t.send),
      step: "mixing",
      progress: t.progressRound(t.mix, facts.mix.finals, facts.mix.titles),
      done,
    };
  if (!masterDone)
    return {
      ...base,
      ...roundState(
        facts.mastering,
        facts.masteringEngineer,
        facts.validator,
        t.sendMastering,
      ),
      step: "mastering",
      progress: t.progressRound(
        t.mastering,
        facts.mastering.finals,
        facts.mastering.titles,
      ),
      done,
    };
  // Every title with audio is at its master final, but a collective still
  // has titles without any: not done, whatever the others say.
  if (silent > 0 && (facts.mix.titles === 0 || delivered))
    return {
      ...base,
      status: "in_progress",
      step: "source",
      reason: t.withoutAudio(silent),
      progress:
        facts.mix.titles === 0
          ? t.progressAlreadyFinal(facts.titles)
          : t.progressFinal(
              facts.deliverables.received,
              facts.deliverables.expected,
            ),
      done,
    };
  // Every title had its master final before the workflow: nothing to mix,
  // said as such rather than as work done through it.
  if (facts.mix.titles === 0)
    return {
      ...base,
      status: "done",
      step: "final",
      reason: t.alreadyFinal,
      progress: t.progressAlreadyFinal(facts.titles),
      done,
    };
  const missing = facts.deliverables.expected - facts.deliverables.received;
  return {
    ...base,
    status: delivered ? "done" : "in_progress",
    step: "final",
    reason: delivered ? t.done : t.deliverables(missing),
    progress: t.progressFinal(
      facts.deliverables.received,
      facts.deliverables.expected,
    ),
    done,
  };
}

// --------------------------------------------------------------- Juridique

export type LegalFacts = {
  launched: boolean;
  openQuestions: number;
  answeredQuestions: number;
  confirmed: boolean;
  planLaunched: boolean;
  // The launched plan's actions, by attention group (ticket Juridique 07).
  counts: { now: number; decision: number; waiting: number; silent: number };
  actionsDone: number;
  actionsTotal: number;
};

export function legalState(facts: LegalFacts): WorkflowState {
  const t = fr.workflowStatus.legal;
  const base = { workflow: "legal" as const };
  const done = [
    ...(facts.confirmed ? ["inventory"] : []),
    ...(facts.planLaunched && facts.actionsDone === facts.actionsTotal
      ? ["plan"]
      : []),
  ];
  const dossier = t.progressDossier(facts.answeredQuestions);
  if (!facts.launched)
    return {
      ...base,
      status: "not_started",
      step: "inventory",
      reason: fr.workflowStatus.notLaunched,
      progress: dossier,
      done,
    };
  if (!facts.confirmed)
    return {
      ...base,
      status: "in_progress",
      step: "inventory",
      reason:
        facts.openQuestions > 0 ? t.questions(facts.openQuestions) : t.confirm,
      progress: dossier,
      done,
    };
  if (!facts.planLaunched)
    return {
      ...base,
      status: "in_progress",
      step: "plan",
      reason: t.launch,
      progress: dossier,
      done,
    };
  const c = facts.counts;
  const progress = t.progressPlan(facts.actionsDone, facts.actionsTotal);
  if (facts.actionsDone === facts.actionsTotal)
    return {
      ...base,
      status: "done",
      step: "plan",
      reason: t.done,
      progress,
      done,
    };
  const reason = [
    c.decision > 0 && t.decisions(c.decision),
    c.now > 0 && t.now(c.now),
    c.waiting > 0 && t.waiting(c.waiting),
  ]
    .filter(Boolean)
    .join(" · ");
  return {
    ...base,
    // Nothing to do on our side, only answers to wait for.
    status:
      c.decision === 0 && c.now === 0 && c.waiting > 0
        ? "waiting"
        : "in_progress",
    step: "plan",
    reason: reason || progress,
    progress,
    done,
  };
}

// --------------------------------------------------------------- Marketing

// The Marketing's chevrons and the project stage each one follows.
const MARKETING_STAGES = [
  { step: "strategy", stage: "launch_strategy" },
  { step: "conception", stage: "design" },
  { step: "production", stage: "production" },
] as const;

export type MarketingFacts = {
  launched: boolean;
  stages: Array<{ key: string; label: string; state: string }>;
  // Suivi & bilan follows the Marketing's own closing (ticket « Suivi &
  // bilan »), never the « review » stage: that one closes the whole project.
  closure: MarketingStatus;
};

export function marketingState(facts: MarketingFacts): WorkflowState {
  const t = fr.workflowStatus.marketing;
  const base = { workflow: "marketing" as const };
  const tracked = MARKETING_STAGES.map((entry) => ({
    ...entry,
    row: facts.stages.find((stage) => stage.key === entry.stage) ?? null,
  })).filter((entry) => entry.row !== null);
  const validated = tracked.filter((entry) => entry.row!.state === "validated");
  const closed = isMarketingClosed(facts.closure);
  const done: string[] = [
    ...validated.map((entry) => entry.step),
    ...(closed ? ["review"] : []),
  ];
  const progress = t.progress(done.length, tracked.length + 1);
  // Closed (with or without reserves): the Marketing is done, whatever its
  // stages say; the project itself is not closed by it.
  if (closed)
    return {
      ...base,
      status: "done",
      step: "review",
      reason: fr.marketingReview.status.values[facts.closure],
      progress,
      done,
    };
  if (!facts.launched)
    return {
      ...base,
      status: "not_started",
      step: "strategy",
      reason: fr.workflowStatus.notLaunched,
      progress,
      done,
    };
  const open = tracked.find((entry) => entry.row!.state !== "validated");
  if (!open)
    return {
      ...base,
      status: facts.closure === "closure_preparing" ? "waiting" : "in_progress",
      step: "review",
      reason: t.review(fr.marketingReview.status.values[facts.closure]),
      progress,
      done,
    };
  const label = fr.shell.project.marketingSteps[open.step];
  const state = open.row!.state;
  return {
    ...base,
    status: state === "awaiting_validation" ? "waiting" : "in_progress",
    step: open.step,
    reason:
      state === "awaiting_validation"
        ? t.awaiting(label)
        : state === "in_progress"
          ? t.inProgress(label)
          : t.toStart(label),
    progress,
    done,
  };
}

// ------------------------------------------------------------ Distribution

// What the Distribution's state reads (ticket « Distribution » § 7), each
// fact from its own source, never one deduced from another.
export type DistributionFacts = {
  // The plan launched: the Distribution starts then.
  launched: boolean;
  paramsConfirmed: boolean;
  recorded: boolean;
  isrc: boolean;
  plannedDate: string | null;
  // The latest version of the dossier not superseded by a new preparation.
  version: {
    number: number;
    status: "pending" | "approved" | "rejected";
  } | null;
  // Declarations of the current deposit cycle (lib/distribution/tracking.ts).
  deposit: { declaredAt: string } | null;
  outcome: "corrections_requested" | "accepted" | null;
  delivered: boolean;
  // Platforms of reference verified by a person (lib/distribution/platforms.ts).
  platforms: { verified: number; reference: number };
  // The follow-up closed and not reopened, or a closure waiting (lot 7).
  closure: {
    status: "pending" | "closed";
    kind: "normal" | "reserves";
    on: string;
    reserves: number;
  } | null;
};

export function distributionState(
  facts: DistributionFacts,
  formatDate: (iso: string) => string,
): WorkflowState {
  const t = fr.workflowStatus.distribution;
  const base = { workflow: "distribution" as const };
  const approved = facts.version?.status === "approved";
  const accepted = approved && facts.outcome === "accepted" && facts.delivered;
  const progress = t.progress(
    [approved, facts.deposit !== null, accepted].filter(Boolean).length,
  );
  // The steps of the journey (lib/ui/distribution-steps.ts) that are done.
  const done = [
    ...(facts.paramsConfirmed ? ["params"] : []),
    ...(approved ? ["dossier"] : []),
    ...(facts.deposit ? ["deposit"] : []),
    ...(accepted ? ["orchard"] : []),
    ...(facts.platforms.verified === facts.platforms.reference
      ? ["platforms"]
      : []),
    ...(facts.closure?.status === "closed" ? ["closure"] : []),
  ];
  const state = (
    status: WorkflowState["status"],
    step: string,
    reason: string,
  ): WorkflowState => ({ ...base, status, step, reason, progress, done });

  if (!facts.launched && !facts.version)
    return state("not_started", "prep", t.notLaunched);
  // Closed: done, and said with its reserves (never « distribué » when
  // closed with reserves).
  if (facts.closure?.status === "closed")
    return state(
      "done",
      "closure",
      facts.closure.kind === "normal"
        ? t.closedNormal(formatDate(facts.closure.on))
        : t.closedReserves(
            formatDate(facts.closure.on),
            facts.closure.reserves,
          ),
    );
  if (facts.closure?.status === "pending")
    return state("waiting", "closure", t.closurePending);
  if (!facts.version && !facts.paramsConfirmed)
    return state("in_progress", "params", t.params);
  if (!facts.version) return state("in_progress", "dossier", t.submit);
  if (facts.version.status === "pending")
    return state("waiting", "dossier", t.pending(facts.version.number));
  if (facts.version.status === "rejected")
    return state("in_progress", "dossier", t.rejected(facts.version.number));
  // Validated: the owner deposits by hand, then follows the distributor.
  if (!facts.deposit)
    return state("in_progress", "deposit", t.deposit(facts.version.number));
  if (facts.outcome === "corrections_requested")
    return state("in_progress", "dossier", t.corrections);
  if (facts.outcome !== "accepted" || !facts.delivered)
    return state(
      "waiting",
      "orchard",
      t.waiting(
        formatDate(facts.deposit.declaredAt),
        facts.plannedDate ? formatDate(facts.plannedDate) : null,
      ),
    );
  if (facts.platforms.verified < facts.platforms.reference)
    return state(
      "in_progress",
      "platforms",
      t.platforms(facts.platforms.verified, facts.platforms.reference),
    );
  return state("in_progress", "closure", t.closure);
}

// ------------------------------------------------------------ Dependencies

export const DEPENDENCY_STATES = [
  "ready",
  "in_progress",
  "waiting",
  "blocked",
] as const;
export type DependencyState = (typeof DEPENDENCY_STATES)[number];

/** What one workflow expects from another (ticket § 10: source, expected
 * object, consumer, state, due date, owner, link). */
export type Dependency = {
  key: string;
  from: WorkflowKey;
  what: string;
  to: WorkflowKey;
  toWhat: string;
  state: DependencyState;
  note: string;
  due: string | null;
  who: string | null;
  href: string;
};

export type DependencyFacts = {
  // The cover of the release and whether the Production delivered it
  // (distribution_cover); null: none found or no Distribution.
  cover?: { title: string; delivered: boolean } | null;
  // Borrowings not secured, readable without the Juridique
  // (distribution_legal_blockers); null: no Distribution.
  legalBlockers?: string[] | null;
  projectId: string;
  workflows: WorkflowKey[];
  states: Partial<Record<WorkflowKey, WorkflowState | "restricted">>;
  owner: string | null;
  // The Brief's Master final date.
  masterDue: string | null;
  // Every title has its master final (null: no Master).
  mastersFinal: boolean | null;
  // The Brief's engineers (null: no Master).
  engineers: { mix: string | null; mastering: string | null } | null;
  // The launched plan's borrowings (null: the Juridique is not readable or
  // its plan does not run).
  clearances: Array<{
    title: string;
    open: boolean;
    due: string | null;
    href: string;
  }> | null;
};

const readable = (
  states: DependencyFacts["states"],
  workflow: WorkflowKey,
): WorkflowState | null => {
  const state = states[workflow];
  return state && state !== "restricted" ? state : null;
};

/** The dependencies the existing data can tell, each computed from its
 * source at every reading: the Master final and the secured borrowings
 * before going online, the Brief's engineers before the service contracts. */
export function dependencies(facts: DependencyFacts): Dependency[] {
  const t = fr.workflowStatus.dependencies;
  const has = (workflow: WorkflowKey) => facts.workflows.includes(workflow);
  const href = (workflow: WorkflowKey, step: string) =>
    workflowStepHref(facts.projectId, workflow, step);
  const deps: Dependency[] = [];
  const master = readable(facts.states, "master");
  const legal = readable(facts.states, "legal");

  if (master && has("distribution")) {
    const ready = facts.mastersFinal === true;
    deps.push({
      key: "master-online",
      from: "master",
      what: t.master.what,
      to: "distribution",
      toWhat: t.master.toWhat,
      state: ready
        ? "ready"
        : master.status === "blocked"
          ? "blocked"
          : master.status === "waiting"
            ? "waiting"
            : "in_progress",
      note: ready ? t.master.ready : master.reason,
      due: facts.masterDue,
      who: facts.owner,
      href: href("master", ready ? "final" : master.step),
    });
  }

  if (legal && has("distribution") && facts.clearances?.length) {
    const open = facts.clearances.filter((c) => c.open);
    const dues = open.flatMap((c) => (c.due ? [c.due] : [])).sort();
    deps.push({
      key: "clearances-online",
      from: "legal",
      what: t.clearances.what,
      to: "distribution",
      toWhat: t.clearances.toWhat,
      state: open.length === 0 ? "ready" : "waiting",
      note:
        open.length === 0
          ? t.clearances.ready(facts.clearances.length)
          : t.clearances.open(open.length, open.map((c) => c.title).join(", ")),
      due: dues[0] ?? null,
      who: facts.owner,
      href: open[0]?.href ?? href("legal", "plan"),
    });
  }

  // The cover delivered by the Production (proto « Pochette livrée »).
  if (
    has("distribution") &&
    facts.cover !== undefined &&
    readable(facts.states, "distribution")?.status !== "not_started"
  ) {
    const delivered = facts.cover?.delivered ?? false;
    deps.push({
      key: "cover-online",
      from: "marketing",
      what: t.cover.what,
      to: "distribution",
      toWhat: t.cover.toWhat,
      state: delivered ? "ready" : "waiting",
      note: facts.cover
        ? delivered
          ? t.cover.ready(facts.cover.title)
          : t.cover.waiting(facts.cover.title)
        : t.cover.none,
      due: null,
      who: facts.owner,
      href: workflowStepHref(facts.projectId, "distribution", "prep"),
    });
  }
  // Without the Juridique, the borrowings still say whether they block.
  if (
    !legal &&
    has("distribution") &&
    facts.legalBlockers &&
    facts.legalBlockers.length > 0
  )
    deps.push({
      key: "clearances-online",
      from: "legal",
      what: t.clearances.what,
      to: "distribution",
      toWhat: t.clearances.toWhat,
      state: "waiting",
      note: t.clearances.open(
        facts.legalBlockers.length,
        facts.legalBlockers.join(", "),
      ),
      due: null,
      who: facts.owner,
      href: workflowStepHref(facts.projectId, "distribution", "prep"),
    });

  if (master && legal && facts.engineers) {
    const { mix, mastering } = facts.engineers;
    const ready = mix !== null && mastering !== null;
    deps.push({
      key: "engineers-contracts",
      from: "master",
      what: t.engineers.what,
      to: "legal",
      toWhat: t.engineers.toWhat,
      state: ready ? "ready" : "waiting",
      note: ready
        ? [...new Set([mix, mastering])].join(", ")
        : t.engineers.missing,
      due: null,
      who: facts.owner,
      href: href("master", "brief"),
    });
  }
  return deps;
}

/** A dependency blocks only the action that needs it (ticket § 3): the
 * Distribution, validated and ready to be deposited by hand (step Suivi), is
 * Bloqué while what the deposit expects is not there; its preparation and
 * its dossier never are, nor a deposit already declared. */
export function withDependencies(
  states: DependencyFacts["states"],
  deps: Dependency[],
): DependencyFacts["states"] {
  const distribution = readable(states, "distribution");
  const missing = deps.filter(
    (dep) => dep.to === "distribution" && dep.state !== "ready",
  );
  // Bloqué while a source the dossier needs is missing (proto `wfStatus`),
  // until the deposit is declared; never before the plan, never once done.
  if (
    !distribution ||
    distribution.status === "not_started" ||
    distribution.status === "done" ||
    distribution.done.includes("deposit") ||
    missing.length === 0
  )
    return states;
  return {
    ...states,
    distribution: {
      ...distribution,
      status: "blocked",
      reason: fr.workflowStatus.dependencies.blockedBy(
        missing.map((dep) => dep.what.toLowerCase()).join(", "),
      ),
    },
  };
}
