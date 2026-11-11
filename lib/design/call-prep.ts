// « Préparer un échange créatif » of the Conception (Chemin A): PO compares
// what each deliverable's intention still lacks and prepares only those
// questions — one topic for the overall direction, one per chosen
// deliverable — plus, since MKT-C2-05, the project's open points and
// whether the release stays within the artist's identity. Written by code,
// no model (same idea as lib/strategy/call-prep.ts). Client-safe.

import type { DeliverableStatus, DesignTopic } from "@/lib/design/intentions";
import { conceptionCall } from "@/lib/i18n/fr/conception-call";

import type { CallPrepDefaults } from "@/lib/calls/prep/types";

const fr = { conceptionCall };

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

/** What the agenda also starts from (MKT-C2-05): the project's open points
 * and the version of the artist's identity the release uses. */
export type DesignCallContext = {
  openPoints: string[];
  identityVersion: number | null;
  // A collective whose main artist changed: the artist the kept identity
  // belongs to (docs/pds-mic-plan.md, § 6 risque 2); null otherwise.
  identityMismatchArtist?: string | null;
};

/** What « Préparer un échange créatif » opens with, prepared by code. */
export type DesignCallSheetData = {
  deliverables: DesignCallDeliverable[];
  directionMissing: DesignTopic[];
  context: DesignCallContext;
  // Checked when the panel opens: the deliverables that lack something.
  selected: string[];
  purpose: string;
  // The common call form's defaults (participants, date, facts).
  prep: CallPrepDefaults;
};

export type DesignCallTopic = {
  // "direction" or a design_deliverables id.
  key: string;
  topic: string;
  minutes: number;
  questions: string[];
};

export const DIRECTION_TOPIC_KEY = "direction";
export const OPEN_POINTS_TOPIC_KEY = "open_points";

const MINUTES_PER_QUESTION = 4;

const minutesFor = (questions: number) =>
  Math.min(15, Math.max(5, questions * MINUTES_PER_QUESTION));

/** The overall direction first (when it lacks anything), then each chosen deliverable. */
export function designCallTopics(
  data: Pick<
    DesignCallSheetData,
    "deliverables" | "directionMissing" | "context"
  >,
  selectedIds: readonly string[],
): DesignCallTopic[] {
  const t = fr.conceptionCall;
  const chosen = new Set(selectedIds);
  const topics: DesignCallTopic[] = [];
  const identity = data.context.identityVersion;
  if (data.directionMissing.length > 0 || identity !== null) {
    const questions = [
      ...(identity !== null
        ? [
            data.context.identityMismatchArtist != null
              ? t.exchanges.identityMismatchQuestion(
                  identity,
                  data.context.identityMismatchArtist,
                )
              : t.exchanges.identityQuestion(identity),
          ]
        : []),
      ...data.directionMissing.map((topic) => t.questions.direction[topic]),
    ];
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
  if (data.context.openPoints.length > 0)
    topics.push({
      key: OPEN_POINTS_TOPIC_KEY,
      topic: t.exchanges.openPointsTopic,
      minutes: minutesFor(data.context.openPoints.length),
      questions: data.context.openPoints,
    });
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
