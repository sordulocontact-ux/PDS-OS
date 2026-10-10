// The synthesis shown before the artistic direction is submitted (ticket
// « Conception » § 7): per section — the overall direction, then each
// deliverable — what is retained, what is linked, and what is still missing.
// Computed by code from what the project holds, never by PO. Client-safe.

import {
  DESIGN_TOPICS,
  DIRECTION_KEY,
  type DesignTopic,
} from "@/lib/design/intentions";
import { intentionsState, type IntentionsState } from "@/lib/design/states";

type Intention = {
  id: string;
  target: string;
  deliverableId: string | null;
  topic: DesignTopic;
  value: string;
  status: string;
};
type Reference = {
  id: string;
  title: string | null;
  url: string | null;
  fileName: string | null;
  note: string | null;
  links: Array<{ deliverableId: string | null }>;
};
type Deliverable = {
  id: string;
  title: string;
  status: "confirmed" | "to_qualify";
  note: string | null;
};

// What still blocks or weakens a section.
export type MissingItem =
  | { kind: "topics"; topics: DesignTopic[] }
  | { kind: "proposals"; count: number }
  | { kind: "not_confirmed" }
  | { kind: "no_reference" }
  | { kind: "to_qualify" };

export type SummarySection = {
  // 'direction' or a deliverable id: the key submit_design_direction takes.
  key: string;
  title: string | null;
  intentions: Array<{ topic: DesignTopic; value: string }>;
  references: Array<{ id: string; label: string; note: string | null }>;
  note: string | null;
  intentionsState: IntentionsState;
  missing: MissingItem[];
};

export function directionSummary({
  deliverables,
  intentions,
  references,
  confirmations,
}: {
  deliverables: Deliverable[];
  intentions: Intention[];
  references: Reference[];
  confirmations: Record<string, Array<{ intention_id: string }>>;
}): SummarySection[] {
  const targets: Array<{ key: string; deliverable: Deliverable | null }> = [
    { key: DIRECTION_KEY, deliverable: null },
    ...deliverables.map((d) => ({ key: d.id, deliverable: d })),
  ];
  return targets.map(({ key, deliverable }) => {
    const id = deliverable?.id ?? null;
    const own = intentions.filter((i) =>
      id ? i.deliverableId === id : i.target === "direction",
    );
    const answers = own.filter((i) => i.status === "confirmed");
    const proposals = own.filter((i) => i.status === "proposed").length;
    const linked = references.filter((r) =>
      r.links.some((l) => l.deliverableId === id),
    );
    const confirmation = confirmations[key]
      ? { snapshot: confirmations[key] }
      : null;
    const state = intentionsState({ answers, proposals, confirmation });
    const answered = new Set(answers.map((a) => a.topic));
    const topics = DESIGN_TOPICS.filter((t) => !answered.has(t));

    const missing: MissingItem[] = [];
    if (deliverable?.status === "to_qualify")
      missing.push({ kind: "to_qualify" });
    if (topics.length) missing.push({ kind: "topics", topics });
    if (proposals) missing.push({ kind: "proposals", count: proposals });
    if (answers.length && state !== "confirmed")
      missing.push({ kind: "not_confirmed" });
    if (linked.length === 0) missing.push({ kind: "no_reference" });

    return {
      key,
      title: deliverable?.title ?? null,
      intentions: answers.map((a) => ({ topic: a.topic, value: a.value })),
      references: linked.map((r) => ({
        id: r.id,
        label: r.title ?? r.fileName ?? r.url ?? "",
        note: r.note,
      })),
      note: deliverable?.note ?? null,
      intentionsState: state,
      missing,
    };
  });
}

/** A section with something to submit: a retained intention or a reference. */
export function hasContent(section: SummarySection): boolean {
  return section.intentions.length > 0 || section.references.length > 0;
}
