// « Dispositif » as in the proto (LEVERS, leverState, dimBody « levers »):
// every lever listed — retained, to arbitrate (« Retenir » / « Ne pas
// retenir »), not retained — PO's proposals decided one by one, the
// Brief's confirmed needs still without lever to arbitrate (nothing is
// decided in advance, rule 21), the common levers not chosen. Client-safe.

import { fr } from "@/lib/i18n/fr";
import type { DimItem, ItemContext } from "@/lib/strategy/dimension-items";
import { LEVER_PRESETS } from "@/lib/strategy/lever-presets";

export type LeverRecord = {
  id: string;
  label: string;
  family: string;
  state: string;
  review_status: string;
  source_type: string;
  source_report_item_id: string | null;
  source_quote: string | null;
  need_id: string | null;
  proposed_label: string | null;
  decided_by: string | null;
  created_by: string | null;
};

export type LeverState = "retained" | "to_decide" | "not_retained";

export type LeverLine =
  | { kind: "proposal"; item: DimItem }
  | {
      kind: "lever";
      key: string;
      name: string;
      source: string;
      quote: string | null;
      state: LeverState;
      by: string | null;
      // What « Retenir » / « Ne pas retenir » act on (to arbitrate only).
      action:
        { type: "lever"; id: string } | { type: "need"; id: string } | null;
    };

/** « Ajouter un levier »: a common lever not taken, or one not retained. */
export type LeverOption = { value: string; label: string };

const t = fr.strategyDimensions;

const normalize = (label: string) =>
  label
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

const presetLabel = (key: (typeof LEVER_PRESETS)[number]["key"]) =>
  fr.strategyDispositif.presets[key];

/** The common lever a label speaks of (« Influence : une douzaine… »). */
function presetOf(label: string): string | null {
  const l = normalize(label);
  const hit = LEVER_PRESETS.map((p) => presetLabel(p.key)).find((name) => {
    const head = normalize(name).split(/[\s/]+/)[0];
    return head.length > 2 && l.startsWith(head);
  });
  return hit ?? null;
}

const STATE: Record<string, LeverState> = {
  selected: "retained",
  to_decide: "to_decide",
  rejected: "not_retained",
};

export function leverLines(
  levers: LeverRecord[],
  openNeeds: Array<{ id: string; label: string }>,
  needLabel: (needId: string | null) => string | null,
  ctx: ItemContext,
): { lines: LeverLine[]; options: LeverOption[] } {
  const lines: LeverLine[] = levers.map((l) => {
    const fromCall = l.source_type === "call";
    if (
      fromCall &&
      (l.review_status !== "confirmed" || l.state === "selected")
    ) {
      const state =
        l.review_status === "proposed"
          ? "proposed"
          : l.review_status === "rejected"
            ? "discarded"
            : "kept";
      const source = ctx.sourceOf(l.source_report_item_id);
      const decider = state === "proposed" ? null : ctx.name(l.decided_by);
      const edited = Boolean(l.proposed_label && l.proposed_label !== l.label);
      return {
        kind: "proposal",
        item: {
          target: { type: "lever", id: l.id },
          proposal: {
            id: `lever-${l.id}`,
            text: l.label,
            original: edited ? l.proposed_label : null,
            context: presetOf(l.label),
            quote: source ? l.source_quote : null,
            from: source?.from ?? null,
            href: source?.href ?? null,
            state,
            decidedBy: decider,
            editedBy: edited && state === "kept" ? decider : null,
          },
        },
      };
    }
    const need = needLabel(l.need_id);
    const by = ctx.name(l.decided_by ?? l.created_by);
    return {
      kind: "lever",
      key: l.id,
      name: l.label,
      source: need ? t.fromBrief : by ? t.typedBy(by) : t.commonLevers,
      quote: need && normalize(need) !== normalize(l.label) ? need : null,
      state: l.review_status === "rejected" ? "not_retained" : STATE[l.state],
      by: l.decided_by ? ctx.name(l.decided_by) : null,
      action: l.state === "to_decide" ? { type: "lever", id: l.id } : null,
    };
  });

  const needs: LeverLine[] = openNeeds.map((n) => ({
    kind: "lever",
    key: `need-${n.id}`,
    name: n.label,
    source: t.fromBrief,
    quote: null,
    state: "to_decide",
    by: null,
    action: { type: "need", id: n.id },
  }));

  // A common lever is taken once a lever speaks of it (« Influence : une
  // douzaine de créateurs » takes « Influence »).
  const taken = new Set(
    [...levers.map((l) => l.label), ...openNeeds.map((n) => n.label)].flatMap(
      (label) => [normalize(label), normalize(presetOf(label) ?? label)],
    ),
  );
  const absent = LEVER_PRESETS.filter(
    (p) => !taken.has(normalize(presetLabel(p.key))),
  );
  const presets: LeverLine[] = absent.map((p) => ({
    kind: "lever",
    key: `preset-${p.key}`,
    name: presetLabel(p.key),
    source: t.commonLevers,
    quote: null,
    state: "not_retained",
    by: null,
    action: null,
  }));

  const options: LeverOption[] = [
    ...levers
      .filter((l) => l.review_status === "confirmed" && l.state === "rejected")
      .map((l) => ({ value: `lever:${l.id}`, label: l.label })),
    ...absent.map((p) => ({
      value: `preset:${p.key}`,
      label: presetLabel(p.key),
    })),
  ];
  return { lines: [...lines, ...needs, ...presets], options };
}

/** Levers retained, as the Brief names them. */
export const retainedLevers = (lines: LeverLine[]) =>
  lines.flatMap((l) =>
    l.kind === "proposal"
      ? l.item.proposal.state === "kept"
        ? [l.item.proposal.context ?? l.item.proposal.text]
        : []
      : l.state === "retained"
        ? [l.name]
        : [],
  );
