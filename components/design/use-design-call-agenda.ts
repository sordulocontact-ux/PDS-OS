"use client";

import { useState } from "react";

import type { PrepTopic } from "@/lib/calls/prep/types";
import {
  designCallPurpose,
  designCallTopics,
  type DesignCallSheetData,
} from "@/lib/design/call-prep";

/**
 * The deliverables a creative exchange is about and what follows from them:
 * PO's points (the common form keeps what the person did with them) and the
 * objective, until the person rewrites it in the form.
 */
export function useDesignCallAgenda(data: DesignCallSheetData) {
  const [selected, setSelected] = useState<ReadonlySet<string>>(
    () => new Set(data.selected),
  );
  const ids = [...selected];
  const agenda: PrepTopic[] = designCallTopics(data, ids).map((x) => ({
    key: x.key,
    topic: x.topic,
    minutes: x.minutes,
    questions: x.questions,
  }));
  return {
    selected,
    ids: data.deliverables.filter((d) => selected.has(d.id)).map((d) => d.id),
    agenda,
    goal: designCallPurpose(data, ids),
    toggle: (id: string) =>
      setSelected((set) => {
        const next = new Set(set);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }),
  };
}
