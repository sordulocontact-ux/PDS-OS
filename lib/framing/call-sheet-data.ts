import "server-only";

import { callPrepDefaults } from "@/lib/calls/prep/defaults";
import type { CallPrepDefaults } from "@/lib/calls/prep/types";
import type { FramingAssessment } from "@/lib/framing/assess";
import { framingCallPurpose, framingCallTopics } from "@/lib/framing/call-prep";
import type { FramingKnowledge } from "@/lib/framing/knowledge";
import { fr } from "@/lib/i18n/fr";

/**
 * What the common call form of the Cadrage opens with: one point per
 * dimension with something open, the owner and the creative team, the
 * project's files to send with the invitation. Video only (framing_calls
 * has no format: the link says it).
 */
export function callSheetData(
  k: FramingKnowledge,
  assessment: FramingAssessment,
): Promise<CallPrepDefaults> {
  const t = fr.callPrep.kinds;
  const topics = framingCallTopics(assessment);
  return callPrepDefaults({
    kind: "framing",
    projectId: k.project.id,
    noun: "exchange",
    title: t.framing.title,
    points: topics.map((x) => ({
      key: x.dimension,
      topic: x.topic,
      minutes: x.minutes,
      questions: x.questions,
    })),
    proposal: {
      personIds: k.creatives.map((c) => c.personId),
      names: k.project.ownerName ? [k.project.ownerName] : [],
    },
    goal: framingCallPurpose(topics),
    facts: [{ label: t.subjects, value: t.framing.subjects }],
    documents: k.files.map((f) => ({ id: f.id, name: f.name })),
    formats: ["video"],
  });
}
