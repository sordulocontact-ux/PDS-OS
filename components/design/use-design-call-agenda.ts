"use client";

import { useState } from "react";

import {
  designCallPurpose,
  designCallTopics,
  type DesignCallSheetData,
} from "@/lib/design/call-prep";

const flip = (set: ReadonlySet<string>, id: string) => {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
};

/**
 * The chosen deliverables of a creative exchange and what follows from them:
 * the agenda (a topic the person removed stays removed when the choice
 * changes) and the objective, until the person rewrites it.
 */
export function useDesignCallAgenda(data: DesignCallSheetData) {
  const [selected, setSelected] = useState(() => new Set(data.selected));
  const [removed, setRemoved] = useState(() => new Set<string>());
  const [purpose, setPurpose] = useState(data.purpose);
  const [purposeEdited, setPurposeEdited] = useState(false);

  const topics = designCallTopics(data, [...selected]).map((x) => ({
    ...x,
    id: x.key,
  }));
  const kept = new Set(
    topics.map((x) => x.id).filter((id) => !removed.has(id)),
  );

  return {
    selected,
    chosen: data.deliverables.filter((d) => selected.has(d.id)),
    topics,
    kept,
    purpose,
    toggleDeliverable: (id: string) => {
      const next = flip(selected, id);
      setSelected(next);
      if (!purposeEdited) setPurpose(designCallPurpose(data, [...next]));
    },
    toggleTopic: (id: string) => setRemoved((set) => flip(set, id)),
    editPurpose: (value: string) => {
      setPurpose(value);
      setPurposeEdited(true);
    },
  };
}
