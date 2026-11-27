// The Plan du Projet PO proposes once the Brief is validated (ticket § 9;
// docs/ARCHITECTURE.md § 6 ter): what starts now (Focus), what follows a
// step (Ensuite), what runs in parallel (Pendant ce temps), what to
// anticipate. Every placement, dependency and reason is decided by code
// from the validated Cadrage (rule 6): PO never decides, and nothing starts
// before « Lancer le plan ». Client-safe.

import { formatBriefDate } from "@/lib/framing/assess";
import type { FramingKnowledge } from "@/lib/framing/knowledge";
import { framingIntel } from "@/lib/i18n/fr/framing-intel";
import { applicableWorkflows } from "@/lib/workflow-status/rules";

const fr = { framingIntel };

export const PLAN_COLUMNS = [
  "focus",
  "next",
  "meanwhile",
  "anticipate",
] as const;
export type PlanColumn = (typeof PLAN_COLUMNS)[number];
export const PLAN_WORKFLOWS = [
  "strategy",
  "master",
  "legal",
  "design",
  "production",
  "activations",
  "distribution",
  "review",
] as const;
export type PlanWorkflow = (typeof PLAN_WORKFLOWS)[number];
// « Lancer le plan » starts every workflow of the plan (lot 2 « Projet
// complet », migration 20261019020101): the column says the order.
export const LAUNCHABLE: readonly PlanWorkflow[] = PLAN_WORKFLOWS;
// The workflows that are parts of the Marketing (« Stratégie · Marketing »).
export const MARKETING_PARTS: readonly PlanWorkflow[] = [
  "strategy",
  "design",
  "production",
  "activations",
  "review",
];

export type ProposedItem = {
  key: string;
  column: PlanColumn;
  workflow: PlanWorkflow | null;
  title: string;
  why: string;
  dependsOn: PlanWorkflow[];
  specialized: string | null;
  ownerPersonId: string | null;
  // PROJ-UX-07: who does it (the pilot by default) and for when (the
  // Cadrage's deadline of its kind, when there is one).
  executorPersonId: string | null;
  dueDate: string | null;
};

// The Cadrage's deadlines that date a workflow (PROJ-UX-07: « une échéance
// de cadrage alimente le bon workflow »).
const DEADLINE_WORKFLOW: Record<string, PlanWorkflow> = {
  master_final: "master",
  delivery: "distribution",
  release: "distribution",
  promotion: "strategy",
};

/** The earliest confirmed deadline of the Cadrage that dates a workflow. */
export function framingDueDate(
  k: FramingKnowledge,
  workflow: PlanWorkflow,
): string | null {
  return (
    k.deadlines
      .filter(
        (d) =>
          d.review_status === "confirmed" &&
          d.due_date &&
          DEADLINE_WORKFLOW[d.kind] === workflow,
      )
      .map((d) => d.due_date as string)
      .sort()[0] ?? null
  );
}

// A target date this close makes the production the critical path.
const CRITICAL_DAYS = 42;

const daysBetween = (from: string, to: string) =>
  Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
      86_400_000,
  );

export function proposePlan(k: FramingKnowledge): ProposedItem[] {
  const t = fr.framingIntel.plan;
  const owner = k.project.ownerPersonId;
  // The workflows the project has (proto « Projet complet »): the Master
  // when it has a title, the Distribution for a music release, the
  // Juridique and the Marketing always — the same rule as its navigation.
  const applies = applicableWorkflows({
    type: k.project.type,
    // The masters (a collective's titles without one count for the Master's
    // work below, not for whether it applies).
    masterCount: k.project.masters.length,
    collective: k.project.collective,
  });
  const music = applies.includes("distribution");
  const items: ProposedItem[] = [];
  const workflow = (
    key: PlanWorkflow,
    column: PlanColumn,
    why: string,
    extra: Partial<ProposedItem> = {},
  ) =>
    items.push({
      key,
      column,
      workflow: key,
      title: t.workflows[key],
      why,
      dependsOn: [],
      specialized: null,
      ownerPersonId: owner,
      executorPersonId: null,
      dueDate: framingDueDate(k, key),
      ...extra,
    });

  workflow("strategy", "focus", t.why.strategy);

  const targetRow = k.framing.briefRows.find(
    (r) => r.field_key === "target_date",
  );
  const target =
    targetRow?.status === "confirmed" && typeof targetRow.value === "string"
      ? targetRow.value
      : null;

  if (applies.includes("master")) {
    const open = k.titles.filter(
      (title) => title.audioState !== "final_master",
    ).length;
    const critical =
      open > 0 &&
      target !== null &&
      daysBetween(k.today, target) <= CRITICAL_DAYS;
    workflow(
      "master",
      critical ? "focus" : "meanwhile",
      critical
        ? t.why.masterFocus(open, formatBriefDate(target))
        : open > 0
          ? t.why.masterMeanwhile(open)
          : t.why.masterReady(k.titles.length),
      { specialized: t.specializedNames.master },
    );
  }

  const blockers = k.framing.constraints.filter(
    (c) => c.type === "rights" && c.review_status === "confirmed",
  ).length;
  workflow(
    "legal",
    blockers > 0 ? "focus" : "meanwhile",
    blockers > 0 ? t.why.legalBlockers(blockers) : t.why.legalMeanwhile,
    { specialized: t.specializedNames.legal },
  );

  // Who pilots by default: the creative director for the Conception, the
  // owner otherwise (proto FR_PLAN; the production manager is chosen in
  // the Production itself).
  const creative = k.creatives[0]?.personId ?? owner;
  workflow("design", "next", t.why.design, {
    dependsOn: ["strategy"],
    ownerPersonId: creative,
  });
  workflow("production", "next", t.why.production, { dependsOn: ["design"] });
  workflow("activations", "next", t.why.activations, {
    dependsOn: ["strategy"],
  });
  if (music)
    workflow("distribution", "anticipate", t.why.distribution, {
      dependsOn: items.some((i) => i.workflow === "master") ? ["master"] : [],
    });
  workflow("review", "anticipate", t.why.review, {
    dependsOn: music ? ["distribution"] : [],
  });
  return items;
}
