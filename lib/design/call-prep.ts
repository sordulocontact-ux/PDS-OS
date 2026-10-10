// « Préparer un échange créatif » of the Conception (Chemin A): PO compares
// what each deliverable's intention still lacks and prepares only those
// questions — one topic for the overall direction, one per chosen
// deliverable. Written by code, no model (same idea as
// lib/strategy/call-prep.ts). Client-safe.

import type { DeliverableStatus, DesignTopic } from "@/lib/design/intentions";
import { fr } from "@/lib/i18n/fr";

export {
  CALL_FORMATS,
  isCallFormat,
  type CallFormat,
} from "@/lib/strategy/call-prep";

export type DesignCallDeliverable = {
  id: string;
  title: string;
  status: DeliverableStatus;
  // Topics with no confirmed intention yet.
  missing: DesignTopic[];
};

/** What « Préparer un échange créatif » opens with, prepared by code. */
export type DesignCallSheetData = {
  deliverables: DesignCallDeliverable[];
  directionMissing: DesignTopic[];
  // Checked when the panel opens: the deliverables that lack something.
  selected: string[];
  purpose: string;
  // Proposed as participants: the owner, the creative team, the artist, the
  // people named on the deliverables.
  people: string[];
  // "YYYY-MM-DDTHH:mm", Paris time.
  defaultOccurredAt: string;
};

export type DesignCallTopic = {
  // "direction" or a design_deliverables id.
  key: string;
  topic: string;
  minutes: number;
  questions: string[];
};

export const DIRECTION_TOPIC_KEY = "direction";

const MINUTES_PER_QUESTION = 4;

const minutesFor = (questions: number) =>
  Math.min(15, Math.max(5, questions * MINUTES_PER_QUESTION));

/** The overall direction first (when it lacks anything), then each chosen deliverable. */
export function designCallTopics(
  data: Pick<DesignCallSheetData, "deliverables" | "directionMissing">,
  selectedIds: readonly string[],
): DesignCallTopic[] {
  const t = fr.conceptionCall;
  const chosen = new Set(selectedIds);
  const topics: DesignCallTopic[] = [];
  if (data.directionMissing.length > 0) {
    const questions = data.directionMissing.map(
      (topic) => t.questions.direction[topic],
    );
    topics.push({
      key: DIRECTION_TOPIC_KEY,
      topic: t.directionTopic,
      minutes: minutesFor(questions.length),
      questions,
    });
  }
  for (const d of data.deliverables) {
    if (!chosen.has(d.id)) continue;
    const questions = [
      ...(d.status === "to_qualify" ? [t.questions.qualify(d.title)] : []),
      ...d.missing.map((topic) => t.questions.deliverable[topic](d.title)),
    ];
    if (questions.length === 0) continue;
    topics.push({
      key: d.id,
      topic: t.deliverableTopic(d.title),
      minutes: minutesFor(questions.length),
      questions,
    });
  }
  return topics;
}

/** The call's objective, proposed from the chosen deliverables (rewritable). */
export function designCallPurpose(
  data: Pick<DesignCallSheetData, "deliverables">,
  selectedIds: readonly string[],
): string {
  const chosen = new Set(selectedIds);
  const titles = data.deliverables
    .filter((d) => chosen.has(d.id))
    .map((d) => d.title);
  return fr.conceptionCall.purpose(titles);
}
