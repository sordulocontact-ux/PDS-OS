import "server-only";

import type { PreparedPoint } from "@/lib/calls/prepare-schema";
import { nextRoundHourInputs } from "@/lib/calls/prep/dates";
import { loadPrepPool, proposedKeys } from "@/lib/calls/prep/people";
import {
  PREP_FORMATS,
  type CallPrepDefaults,
  type PrepFact,
  type PrepFormat,
  type PreparedCallKind,
} from "@/lib/calls/prep/types";
import { googleMeetConfigured } from "@/lib/integrations/google-calendar";

/**
 * What the common call form opens with, computed by the module's code on
 * the server: PO's points, the participants it proposes (ids, or names it
 * computed itself, matched to the team then the Réseau), the objective and
 * what goes with the invitation. The date is the next round hour.
 */
export async function callPrepDefaults(args: {
  kind: PreparedCallKind;
  projectId: string;
  noun: "exchange" | "call";
  title: string;
  target?: Record<string, string>;
  points: PreparedPoint[];
  proposal: { personIds?: string[]; contactIds?: string[]; names?: string[] };
  linkContactIds?: string[];
  goal: string;
  facts?: PrepFact[];
  documents?: Array<{ id: string; name: string }>;
  note?: string;
  formats?: readonly PrepFormat[];
}): Promise<CallPrepDefaults> {
  const people = await loadPrepPool(args.projectId, args.linkContactIds);
  const { date, time } = nextRoundHourInputs(new Date());
  return {
    kind: args.kind,
    projectId: args.projectId,
    noun: args.noun,
    title: args.title,
    target: args.target ?? {},
    people,
    attendeeKeys: proposedKeys(people, args.proposal),
    agenda: args.points.map((p) => ({
      key: p.key,
      topic: p.topic,
      minutes: p.minutes,
      questions: p.questions,
    })),
    goal: args.goal,
    facts: args.facts ?? [],
    documents: args.documents,
    note: args.note,
    date,
    time,
    format: "video",
    googleMeet: googleMeetConfigured(),
    formats: args.formats ?? PREP_FORMATS,
  };
}
