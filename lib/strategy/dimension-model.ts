// « Les 8 dimensions » as the proto shows them (dims, dimBody): each
// dimension's lines and its state, computed by code (rule 6). The words of
// the states are the ticket's (§ 2): À compléter, En cours, À arbitrer,
// Complété. The step is done when nothing is « à arbitrer » nor « à
// compléter » (proto); what is « En cours » goes to « Restant à arbitrer »
// in the Brief without blocking it. Client-safe, pure.

import type { BudgetLine } from "@/lib/budget/types";
import { formatBriefDate } from "@/lib/framing/assess";
import { fr } from "@/lib/i18n/fr";
import { budgetView, type BudgetView } from "@/lib/strategy/dimension-budget";
import {
  audienceItem,
  fieldItem,
  keptOf,
  kindItems,
  pendingOf,
  type DimItem,
  type FieldHistoryRow,
  type ItemContext,
  type ProposalRecord,
} from "@/lib/strategy/dimension-items";
import {
  leverLines,
  type LeverLine,
  type LeverOption,
  type LeverRecord,
} from "@/lib/strategy/dimension-levers";
import {
  STRATEGY_DIMENSIONS,
  type StrategyDimension,
} from "@/lib/strategy/dimensions";
import { addDays, dayOffset } from "@/lib/strategy/calendar";
import { formatDay } from "@/lib/utils/day";

export type DimState = "to_complete" | "in_progress" | "to_decide" | "complete";

export type DimensionView = {
  key: StrategyDimension;
  state: DimState;
  toConfirm: number;
  items: DimItem[];
  levers?: LeverLine[];
  leverOptions?: LeverOption[];
  budget?: BudgetView;
  // « Ajouter … » offered (one answer only for the positioning and angle).
  canAdd: boolean;
};

export type StrategyModel = {
  dimensions: DimensionView[];
  // Proposals of PO still to confirm or set aside, every dimension.
  pending: number;
  // Lines kept (« n réponses confirmées »).
  confirmed: number;
  ready: boolean;
  firstToDecide: StrategyDimension | null;
  firstToComplete: StrategyDimension | null;
  // « Restant à arbitrer » of the Brief, without blocking it.
  openPoints: Array<{ dimension: StrategyDimension; text: string }>;
};

export type ModelInput = {
  fieldRows: FieldHistoryRow[];
  proposals: ProposalRecord[];
  levers: LeverRecord[];
  openNeeds: Array<{ id: string; label: string }>;
  needLabel: (needId: string | null) => string | null;
  audiences: Array<{ id: string; segment: string; created_by: string | null }>;
  deliverables: Array<{
    id: string;
    title: string;
    format: string | null;
    created_by: string | null;
  }>;
  milestones: Array<{
    id: string;
    title: string;
    occurs_on: string;
    created_by: string | null;
  }>;
  objectives: Array<{ id: string; label: string; created_by: string | null }>;
  budgetLines: BudgetLine[];
  envelopeCents: number | null;
  envelopeToConfirm: boolean;
  referenceDate: string | null;
  // Upstream deadlines passed without a decision (lib/strategy/upstream.ts).
  lateUpstream: number;
  // Paris's day (ISO): a milestone before it is already past (MKT-STR-004).
  today?: string;
  // The legal plan's open items: blocked or without a date, to arbitrate.
  legalDependencies?: Array<{
    label: string;
    status: string;
    dueOn: string | null;
  }>;
  ctx: ItemContext;
};

/** « J-14 », « J », « J+7 » (proto jLabel). */
export const dayLabel = (n: number) =>
  n === 0 ? "J" : n > 0 ? `J+${n}` : `J${n}`;

function textState(items: DimItem[]): DimState {
  if (pendingOf(items) > 0) return "to_decide";
  return keptOf(items) > 0 ? "complete" : "to_complete";
}

export function strategyModel(i: ModelInput): StrategyModel {
  const field = (key: Parameters<typeof fieldItem>[0]) =>
    fieldItem(key, i.fieldRows, i.ctx);
  const one = (item: DimItem | null) => (item ? [item] : []);
  const single = (items: DimItem[]) =>
    items.every((x) => x.proposal.state === "discarded");

  const positioning = one(field("positioning"));
  const narrative = one(field("narrative"));
  const audiences = [
    ...one(field("audiences")),
    ...i.audiences.map((a) => audienceItem(a, i.ctx)),
  ];
  const deliverables = kindItems(
    "deliverable",
    i.proposals,
    i.deliverables.map((d) => ({
      id: d.id,
      text: d.title,
      created_by: d.created_by,
    })),
    i.ctx,
    ({ rowId, proposal }) =>
      proposal?.format ??
      i.deliverables.find((d) => d.id === rowId)?.format ??
      null,
  );
  const dayOf = (rowId: string | null, offset: number | null) => {
    const row = i.milestones.find((m) => m.id === rowId);
    if (row) return row.occurs_on;
    return i.referenceDate && offset !== null
      ? addDays(i.referenceDate, offset)
      : null;
  };
  const calendar = kindItems(
    "milestone",
    i.proposals,
    i.milestones.map((m) => ({
      id: m.id,
      text: m.title,
      created_by: m.created_by,
    })),
    i.ctx,
    ({ rowId, proposal }) => {
      const day = dayOf(rowId, proposal?.offset_days ?? null);
      const offset =
        day && i.referenceDate
          ? dayOffset(day, i.referenceDate)
          : (proposal?.offset_days ?? null);
      return (
        [offset !== null ? dayLabel(offset) : null, day ? formatDay(day) : null]
          .filter(Boolean)
          .join(" · ") || null
      );
    },
  )
    .map((item) => {
      const proposal = i.proposals.find(
        (p) => item.target.type === "proposal" && p.id === item.target.id,
      );
      const rowId =
        item.target.type === "item"
          ? item.target.id
          : (proposal?.item_id ?? null);
      return { ...item, day: dayOf(rowId, proposal?.offset_days ?? null) };
    })
    .sort((a, b) => (a.day ?? "9999").localeCompare(b.day ?? "9999"));
  const objectives = [
    ...one(field("strategic_objective")).map((x) => ({
      ...x,
      proposal: {
        ...x.proposal,
        context: fr.strategyDimensions.strategicObjective,
      },
    })),
    ...kindItems(
      "objective",
      i.proposals,
      i.objectives.map((o) => ({
        id: o.id,
        text: o.label,
        created_by: o.created_by,
      })),
      i.ctx,
      () => null,
    ),
  ];

  const levers = leverLines(i.levers, i.openNeeds, i.needLabel, i.ctx);
  const leverItems = levers.lines.flatMap((l) =>
    l.kind === "proposal" ? [l.item] : [],
  );
  const leverState = (id: string) => {
    const l = i.levers.find((x) => x.id === id);
    if (!l) return null;
    if (l.review_status === "rejected" || l.state === "rejected")
      return "not_retained";
    if (l.review_status === "proposed" || l.state === "to_decide")
      return "to_decide";
    return "retained";
  };
  const budget = budgetView(
    i.budgetLines,
    leverState,
    i.envelopeCents,
    i.envelopeToConfirm,
  );

  const leversToDecide =
    pendingOf(leverItems) > 0 ||
    levers.lines.some((l) => l.kind === "lever" && l.state === "to_decide");
  const retained = levers.lines.some(
    (l) =>
      (l.kind === "lever" && l.state === "retained") ||
      (l.kind === "proposal" && l.item.proposal.state === "kept"),
  );
  const calendarState: DimState =
    pendingOf(calendar) > 0 || i.lateUpstream > 0
      ? "to_decide"
      : keptOf(calendar) > 0
        ? i.referenceDate
          ? "complete"
          : "in_progress"
        : "to_complete";
  const budgetState: DimState =
    budget.toDecideCents > 0 ||
    (budget.restCents !== null && budget.restCents < 0)
      ? "to_decide"
      : budget.envelope === "undefined" || budget.envelope === "to_confirm"
        ? "in_progress"
        : "complete";

  const view = (
    key: StrategyDimension,
    items: DimItem[],
    state: DimState,
    canAdd: boolean,
    extra: Partial<DimensionView> = {},
  ): DimensionView => ({
    key,
    items,
    state,
    canAdd,
    toConfirm: pendingOf(items),
    ...extra,
  });
  const byKey: Record<StrategyDimension, DimensionView> = {
    positioning: view(
      "positioning",
      positioning,
      textState(positioning),
      single(positioning),
    ),
    audiences: view("audiences", audiences, textState(audiences), true),
    narrative: view(
      "narrative",
      narrative,
      textState(narrative),
      single(narrative),
    ),
    levers: view(
      "levers",
      leverItems,
      leversToDecide ? "to_decide" : retained ? "complete" : "to_complete",
      levers.options.length > 0,
      { levers: levers.lines, leverOptions: levers.options },
    ),
    deliverables: view(
      "deliverables",
      deliverables,
      textState(deliverables),
      true,
    ),
    calendar: view("calendar", calendar, calendarState, true),
    budget: view("budget", [], budgetState, true, { budget }),
    objectives: view("objectives", objectives, textState(objectives), true),
  };
  const dimensions = STRATEGY_DIMENSIONS.map((key) => byKey[key]);
  const t = fr.strategyBriefOut.open;
  const openPoints: StrategyModel["openPoints"] = [
    ...(budget.envelope === "to_confirm"
      ? [{ dimension: "budget" as const, text: t.envelopeToConfirm }]
      : []),
    ...(budget.envelope === "undefined"
      ? [{ dimension: "budget" as const, text: t.envelopeUndefined }]
      : []),
    ...(!i.referenceDate
      ? [{ dimension: "calendar" as const, text: t.noReleaseDate }]
      : []),
    // Recette 23/10 (MKT-STR-004): a milestone already past is said too.
    ...(i.today
      ? i.milestones
          .filter((m) => m.occurs_on < (i.today as string))
          .map((m) => ({
            dimension: "calendar" as const,
            text: t.milestonePassed(m.title, formatBriefDate(m.occurs_on)),
          }))
      : []),
    // A legal dependency blocked or without a date stays to arbitrate.
    ...(i.legalDependencies ?? []).flatMap((d) =>
      d.status === "blocked"
        ? [{ dimension: "levers" as const, text: t.legalBlocked(d.label) }]
        : d.dueOn === null
          ? [{ dimension: "levers" as const, text: t.legalNoDate(d.label) }]
          : [],
    ),
  ];
  return {
    dimensions,
    pending: dimensions.reduce((n, d) => n + d.toConfirm, 0),
    confirmed: dimensions.reduce((n, d) => n + keptOf(d.items), 0),
    ready: dimensions.every(
      (d) => d.state !== "to_decide" && d.state !== "to_complete",
    ),
    firstToDecide: dimensions.find((d) => d.state === "to_decide")?.key ?? null,
    firstToComplete:
      dimensions.find((d) => d.state === "to_complete")?.key ?? null,
    openPoints,
  };
}
