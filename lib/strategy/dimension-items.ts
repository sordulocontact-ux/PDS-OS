// The lines of « Les 8 dimensions » (proto itemRow): every answer, lever,
// deliverable, milestone and objective as a proposal decided one by one —
// PO's (with the exact sentence and where it was said), or a person's own
// (« Saisi par … »). Written by code from what the strategy holds, never by
// PO (rule 6). Client-safe, pure.

import {
  STRATEGY_TEXT_FIELDS,
  type StrategyTextField,
} from "@/lib/framing/brief";
import { fr } from "@/lib/i18n/fr";
import { choicesKey, toChoiceValue } from "@/lib/strategy/choices";
import { composeAnswer } from "@/lib/strategy/compose";
import type { Proposal, ProposalState } from "@/lib/ui/proposal";

export const STRATEGY_ANSWER_FIELDS = [
  "positioning",
  "audiences",
  "narrative",
  "strategic_objective",
] as const;
export type StrategyAnswerField = (typeof STRATEGY_ANSWER_FIELDS)[number];

export type ItemKind = "deliverable" | "milestone" | "objective";

/** What a line's buttons act on. */
export type ItemTarget =
  | { type: "field"; key: StrategyAnswerField }
  | { type: "lever"; id: string }
  | { type: "proposal"; id: string }
  | { type: "item"; kind: ItemKind; id: string }
  | { type: "audience"; id: string };

export type DimItem = {
  proposal: Proposal;
  target: ItemTarget;
  // A milestone's day (« 2026-12-12 »), for the order of the calendar.
  day?: string | null;
};

// A row of field_values, as appended (history kept, oldest first).
export type FieldHistoryRow = {
  field_key: string;
  value: unknown;
  status: string;
  source_type: string;
  source_report_item_id: string | null;
  source_quote: string | null;
  created_by: string | null;
};

// strategy_proposals, as read.
export type ProposalRecord = {
  id: string;
  kind: string;
  text: string;
  proposed_text: string;
  format: string | null;
  offset_days: number | null;
  state: string;
  source_type: string;
  source_report_item_id: string | null;
  source_quote: string | null;
  item_id: string | null;
  decided_by: string | null;
  created_by: string | null;
};

/** Where a line comes from, resolved by the loader. */
export type SourceOf = (
  reportItemId: string | null,
) => { from: string; href: string | null } | null;

export type ItemContext = {
  name: (personId: string | null) => string | null;
  sourceOf: SourceOf;
};

const t = fr.strategyDimensions;

const STATE: Record<string, ProposalState> = {
  proposed: "proposed",
  confirmed: "kept",
  kept: "kept",
  rejected: "discarded",
  discarded: "discarded",
};

/** The source line: the quote and where it was said, or « Saisi par … ». */
function sourced(
  ctx: ItemContext,
  quote: string | null,
  reportItemId: string | null,
  typedBy: string | null,
): Pick<Proposal, "quote" | "from" | "href"> {
  const source = ctx.sourceOf(reportItemId);
  if (quote && source) return { quote, from: source.from, href: source.href };
  return { quote: null, from: typedBy ? t.typedBy(typedBy) : null };
}

/**
 * One answer field (positioning, publics, angle, strategic objective) as a
 * line: its latest row says its state (a rejection keeps its words, struck
 * through), PO's first proposal its original words and quote.
 */
export function fieldItem(
  key: StrategyAnswerField,
  rows: FieldHistoryRow[],
  ctx: ItemContext,
): DimItem | null {
  const own = rows.filter((r) => r.field_key === key);
  const latest = own[own.length - 1];
  if (!latest || typeof latest.value !== "string" || !latest.value.trim())
    return choicesItem(key, rows, ctx);
  const proposed = own.find((r) => r.status === "proposed") ?? null;
  const state = STATE[latest.status] ?? "proposed";
  const decider = state === "proposed" ? null : ctx.name(latest.created_by);
  const edited =
    proposed !== null &&
    typeof proposed.value === "string" &&
    proposed.value !== latest.value;
  const quote = latest.source_quote ?? proposed?.source_quote ?? null;
  const itemId =
    latest.source_report_item_id ?? proposed?.source_report_item_id ?? null;
  return {
    target: { type: "field", key },
    proposal: {
      id: `field-${key}`,
      text: latest.value,
      original: edited ? (proposed.value as string) : null,
      ...sourced(
        ctx,
        quote,
        itemId,
        proposed ? null : ctx.name(own[0].created_by),
      ),
      state,
      decidedBy: decider,
      editedBy: edited && state === "kept" ? decider : null,
    },
  };
}

/**
 * An answer only checked (no sentence written): the sentence composed from
 * the choices, kept — the owner checked them (MKT-S1-01; recette 23/10,
 * MKT-STR-001: never « — » in the Brief for a checked answer).
 */
function choicesItem(
  key: StrategyAnswerField,
  rows: FieldHistoryRow[],
  ctx: ItemContext,
): DimItem | null {
  if (!(STRATEGY_TEXT_FIELDS as readonly string[]).includes(key)) return null;
  const field = key as StrategyTextField;
  const own = rows.filter((r) => r.field_key === choicesKey(field));
  const latest = own[own.length - 1];
  if (!latest) return null;
  const text = composeAnswer(field, toChoiceValue(field, latest.value));
  if (!text) return null;
  const by = ctx.name(latest.created_by);
  return {
    target: { type: "field", key },
    proposal: {
      id: `field-${key}`,
      text,
      original: null,
      quote: null,
      from: by ? t.typedBy(by) : null,
      state: "kept",
      decidedBy: by,
      editedBy: null,
    },
  };
}

/** A proposal of strategy_proposals (deliverable, milestone, objective). */
export function proposalItem(
  p: ProposalRecord,
  ctx: ItemContext,
  context: string | null,
): DimItem {
  const state = STATE[p.state] ?? "proposed";
  const edited = p.text !== p.proposed_text;
  const decider = state === "proposed" ? null : ctx.name(p.decided_by);
  return {
    target: { type: "proposal", id: p.id },
    proposal: {
      id: `proposal-${p.id}`,
      text: p.text,
      original: edited ? p.proposed_text : null,
      context,
      ...sourced(
        ctx,
        p.source_quote,
        p.source_report_item_id,
        p.source_type === "manual"
          ? ctx.name(p.created_by ?? p.decided_by)
          : null,
      ),
      state,
      decidedBy: decider,
      editedBy: edited && state === "kept" ? decider : null,
    },
  };
}

/** A row entered before the proposals (no line yet): kept, « Saisi par ». */
export function legacyItem(
  kind: ItemKind,
  row: { id: string; text: string; created_by: string | null },
  ctx: ItemContext,
  context: string | null,
): DimItem {
  const by = ctx.name(row.created_by);
  return {
    target: { type: "item", kind, id: row.id },
    proposal: {
      id: `${kind}-${row.id}`,
      text: row.text,
      context,
      from: by ? t.typedBy(by) : null,
      state: "kept",
      decidedBy: by,
    },
  };
}

/** A public entered as a row (strategy_audiences): kept, « Saisi par ». */
export function audienceItem(
  a: { id: string; segment: string; created_by: string | null },
  ctx: ItemContext,
): DimItem {
  const by = ctx.name(a.created_by);
  return {
    target: { type: "audience", id: a.id },
    proposal: {
      id: `audience-${a.id}`,
      text: a.segment,
      from: by ? t.typedBy(by) : null,
      state: "kept",
      decidedBy: by,
    },
  };
}

/**
 * The lines of one kind: PO's proposals and the person's own (each with
 * its row once kept), then the rows that have no line (entered before).
 */
export function kindItems(
  kind: ItemKind,
  proposals: ProposalRecord[],
  rows: Array<{ id: string; text: string; created_by: string | null }>,
  ctx: ItemContext,
  contextOf: (p: {
    rowId: string | null;
    proposal?: ProposalRecord;
  }) => string | null,
): DimItem[] {
  const own = proposals.filter((p) => p.kind === kind);
  const linked = new Set(own.flatMap((p) => (p.item_id ? [p.item_id] : [])));
  return [
    ...own.map((p) =>
      proposalItem(p, ctx, contextOf({ rowId: p.item_id, proposal: p })),
    ),
    ...rows
      .filter((r) => !linked.has(r.id))
      .map((r) => legacyItem(kind, r, ctx, contextOf({ rowId: r.id }))),
  ];
}

export const pendingOf = (items: DimItem[]) =>
  items.filter((i) => i.proposal.state === "proposed").length;
export const keptOf = (items: DimItem[]) =>
  items.filter((i) => i.proposal.state === "kept").length;
