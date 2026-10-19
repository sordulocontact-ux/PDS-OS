"use client";

import { useState } from "react";

import type { PrepTopic } from "@/lib/calls/prep/types";

export type AgendaDraftItem = PrepTopic & { id: string };

let next = 0;
const draftOf = (topic: PrepTopic): AgendaDraftItem => ({
  ...topic,
  id: topic.key ? `k:${topic.key}` : `n:${++next}`,
});

/**
 * The agenda being edited, over the points PO prepares. When PO's points
 * change (the Conception's deliverables chosen), a new point appears at the
 * end, a point PO no longer prepares goes, and what the person did stays:
 * their order, their wording, their own points, the points they removed.
 */
export function useAgendaDraft(prepared: PrepTopic[]) {
  const [items, setItems] = useState<AgendaDraftItem[]>(() =>
    prepared.map(draftOf),
  );
  const [removed, setRemoved] = useState<ReadonlySet<string>>(new Set());

  const keys = new Set(prepared.flatMap((p) => (p.key ? [p.key] : [])));
  const kept = new Set(items.flatMap((i) => (i.key ? [i.key] : [])));
  const visible = [
    ...items.filter((i) => !i.key || keys.has(i.key)),
    ...prepared
      .filter((p) => p.key && !kept.has(p.key) && !removed.has(p.key))
      .map(draftOf),
  ];

  const change = (nextItems: AgendaDraftItem[]) => {
    const still = new Set(nextItems.map((i) => i.id));
    const gone = visible
      .filter((i) => i.key && !still.has(i.id))
      .map((i) => i.key!);
    if (gone.length) setRemoved((set) => new Set([...set, ...gone]));
    setItems(nextItems);
  };
  const add = (topic: string) =>
    change([
      ...visible,
      draftOf({ key: null, topic, minutes: null, questions: [] }),
    ]);

  return { items: visible, change, add };
}
