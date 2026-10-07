import "server-only";

import type { CallSheetData } from "@/components/framing/intel/framing-call-sheet";
import { nextRoundHourInput } from "@/lib/calls/format";
import type { FramingAssessment } from "@/lib/framing/assess";
import { framingCallPurpose, framingCallTopics } from "@/lib/framing/call-prep";
import type { FramingKnowledge } from "@/lib/framing/knowledge";

/** What « Préparer un échange » opens with, prepared by code. */
export function callSheetData(
  k: FramingKnowledge,
  assessment: FramingAssessment,
): CallSheetData {
  const topics = framingCallTopics(assessment);
  return {
    topics,
    purpose: framingCallPurpose(topics),
    people: [
      ...(k.project.ownerName ? [k.project.ownerName] : []),
      ...k.creatives.map((c) => c.name),
    ],
    documents: k.files.map((f) => ({ id: f.id, name: f.name })),
    defaultOccurredAt: nextRoundHourInput(new Date()),
  };
}
