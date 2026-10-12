// The Plan du Projet PO proposes once the Brief is validated (ticket § 9;
// docs/ARCHITECTURE.md § 6 ter): what starts now (Focus), what follows a
// step (Ensuite), what runs in parallel (Pendant ce temps), what to
// anticipate. Every placement, dependency and reason is decided by code
// from the validated Cadrage (rule 6): PO never decides, and nothing starts
// before « Lancer le plan ». Client-safe.

import { formatEuros } from "@/lib/budget/types";
import { answerOf, formatBriefDate, rolesContext } from "@/lib/framing/assess";
import type { FramingKnowledge } from "@/lib/framing/knowledge";
import { teamBoard } from "@/lib/framing/team-board";
import { fr } from "@/lib/i18n/fr";

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
  "delivery",
] as const;
export type PlanWorkflow = (typeof PLAN_WORKFLOWS)[number];
// The three workflows that wait for the plan (the others follow their stage).
export const LAUNCHABLE: readonly PlanWorkflow[] = [
  "strategy",
  "master",
  "legal",
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
  delivery: "delivery",
  release: "delivery",
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

const confirmedText = (k: FramingKnowledge, key: string): string | null => {
  const row = k.framing.briefRows.find((r) => r.field_key === key);
  return row?.status === "confirmed" &&
    typeof row.value === "string" &&
    row.value.trim()
    ? row.value
    : null;
};

export function proposePlan(k: FramingKnowledge): ProposedItem[] {
  const t = fr.framingIntel.plan;
  const owner = k.project.ownerPersonId;
  const music = k.project.type === "music_release" && k.titles.length > 0;
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

  if (music) {
    const open = k.titles.filter(
      (title) => title.audioState !== "final_master",
    ).length;
    if (open > 0) {
      const critical =
        target !== null && daysBetween(k.today, target) <= CRITICAL_DAYS;
      workflow(
        "master",
        critical ? "focus" : "meanwhile",
        critical
          ? t.why.masterFocus(open, formatBriefDate(target))
          : t.why.masterMeanwhile(open),
        { specialized: t.specializedNames.master },
      );
    }
  }

  const blockers = k.framing.constraints.filter(
    (c) => c.type === "rights" && c.review_status === "confirmed",
  ).length;
  const legalNeeds = confirmedText(k, "legal_needs");
  if (music || blockers > 0 || legalNeeds) {
    workflow(
      "legal",
      blockers > 0 ? "focus" : "meanwhile",
      blockers > 0 ? t.why.legalBlockers(blockers) : t.why.legalMeanwhile,
      { specialized: t.specializedNames.legal },
    );
  }

  workflow("design", "next", t.why.design, { dependsOn: ["strategy"] });
  if (music)
    workflow("delivery", "next", t.why.delivery, {
      dependsOn: items.some((i) => i.workflow === "master")
        ? ["master", "legal"]
        : ["legal"],
    });

  // To anticipate: dated deadlines, roles to find, the budget, legal needs,
  // decisions still open — notes, never launched.
  const notes: string[] = [];
  for (const d of k.deadlines.filter(
    (d) => d.review_status === "confirmed" && d.due_date,
  ))
    notes.push(
      t.anticipate.deadline(
        d.kind === "other" && d.label
          ? d.label
          : fr.framingIntel.deadlineKinds[
              d.kind as keyof typeof fr.framingIntel.deadlineKinds
            ],
        formatBriefDate(d.due_date!),
      ),
    );
  for (const card of teamBoard(k.framing.team, k.framing.needs, rolesContext(k))
    .roles)
    if (!card.member && !card.holder)
      notes.push(t.anticipate.role(fr.framingGuide.team.roles[card.role]));
  const envelopeRow = k.framing.briefRows.find(
    (r) => r.field_key === "budget_envelope",
  );
  // An amount, or { cents, certainty } since PROJ-UX-05 (read by answerOf).
  const envelopeAnswer =
    envelopeRow?.status === "confirmed"
      ? answerOf("budget_envelope", envelopeRow.value)
      : null;
  const envelope =
    envelopeAnswer?.kind === "money" ? envelopeAnswer.cents : null;
  const engaged = k.budgetLines
    .filter((l) => l.status === "committed" || l.status === "paid")
    .reduce((sum, l) => sum + l.amountCents, 0);
  if (envelope === null) notes.push(t.anticipate.noEnvelope);
  else if (engaged > envelope)
    notes.push(t.anticipate.overBudget(formatEuros(engaged - envelope)));
  if (legalNeeds) notes.push(t.anticipate.legalNeed(legalNeeds));
  for (const point of k.framing.openPoints.filter((p) => p.status === "open"))
    notes.push(t.anticipate.openPoint(point.question));

  notes.forEach((note, index) =>
    items.push({
      key: `note-${index}`,
      column: "anticipate",
      workflow: null,
      title: note.slice(0, 200),
      why: "",
      dependsOn: [],
      specialized: null,
      ownerPersonId: null,
      executorPersonId: null,
      dueDate: null,
    }),
  );
  return items;
}
