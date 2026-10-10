// « Préparer un call de production » (Marketing › Production): PO compares
// what one deliverable's preparation still lacks — the director's brief, the
// director, the teams, the people, their availability — and prepares only
// those topics, each with its questions and an approximate length. Written
// by code, no model (same idea as lib/strategy/call-prep.ts). Client-safe.

import { topicMinutes } from "@/lib/calls/prepare";
import { fr } from "@/lib/i18n/fr";
import { missingBriefTopics } from "@/lib/production/brief";
import { NEED_FAMILIES, isRoleOf } from "@/lib/production/roles";
import type {
  ProductionNeed,
  ProductionSheetData,
} from "@/lib/production/sheet";

export {
  CALL_FORMATS,
  isCallFormat,
  type CallFormat,
} from "@/lib/strategy/call-prep";

// One topic per kind of gap, in the order the call takes them.
export const PRODUCTION_CALL_TOPICS = [
  "brief",
  "director",
  "families",
  "staffing",
  "availability",
] as const;
export type ProductionCallTopicKey = (typeof PRODUCTION_CALL_TOPICS)[number];

export type ProductionCallTopic = {
  key: ProductionCallTopicKey;
  topic: string;
  minutes: number;
  questions: string[];
};

/** What « Préparer un call de production » opens with, prepared by code. */
export type ProductionCallSheetData = {
  sheetId: string;
  deliverableId: string;
  deliverableTitle: string;
  topics: ProductionCallTopic[];
  purpose: string;
  // Proposed as participants: the deliverable's owner, the director, the
  // people assigned to a position (not those who said they are unavailable).
  people: string[];
};

// What the topics read of the sheet.
export type ProductionPrepInput = Pick<ProductionSheetData, "sheet" | "needs">;

// A long list (many positions) stays one topic of reasonable length; the
// brief's seven sections fit.
const MAX_QUESTIONS = 8;

// The brief's sections in the order it reads (lib/production/brief.ts).
const BRIEF_ORDER = [
  "stagingIntent",
  "coverage",
  "camera",
  "sound",
  "runOfShow",
  "constraintsNote",
  "referencesNote",
] as const satisfies ReadonlyArray<keyof ReturnType<typeof missingBriefTopics>>;

/** A position as the call names it: its label, else the preset's, plus the speciality. */
export function roleName(
  need: Pick<ProductionNeed, "family" | "roleKey" | "label" | "speciality">,
): string {
  const t = fr.productionNeeds;
  const base =
    need.label?.trim() ||
    (isRoleOf(need.family, need.roleKey)
      ? t.roles[need.roleKey]
      : t.roles.other);
  return need.speciality?.trim() ? `${base} · ${need.speciality}` : base;
}

// An assignment fills its position unless the person is unavailable.
const filling = (need: ProductionNeed) =>
  need.assignments.filter((a) => a.availability !== "unavailable");

function questionsOf(
  key: ProductionCallTopicKey,
  input: ProductionPrepInput,
): string[] {
  const q = fr.productionCall.questions;
  const sheet = input.sheet;
  switch (key) {
    case "brief": {
      if (!sheet) return [];
      const missing = missingBriefTopics(sheet.brief);
      return BRIEF_ORDER.filter((topic) => missing[topic]).map(
        (topic) => q.brief[topic],
      );
    }
    case "director":
      return sheet && !sheet.director ? [q.director] : [];
    case "families": {
      const held = new Set(input.needs.map((n) => n.family));
      return NEED_FAMILIES.filter((family) => !held.has(family)).map((family) =>
        q.family(fr.productionNeeds.families[family]),
      );
    }
    case "staffing":
      return input.needs.flatMap((need) => {
        const filled = filling(need).length;
        return filled < need.headcount
          ? [q.staff(roleName(need), filled, need.headcount)]
          : [];
      });
    case "availability":
      return input.needs.flatMap((need) =>
        need.assignments
          .filter((a) => a.availability === "to_confirm")
          .map((a) => q.availability(a.holder.name, roleName(need))),
      );
  }
}

/** The topics still open, each with its questions and approximate length. */
export function productionCallTopics(
  input: ProductionPrepInput,
): ProductionCallTopic[] {
  return PRODUCTION_CALL_TOPICS.flatMap((key) => {
    const questions = questionsOf(key, input).slice(0, MAX_QUESTIONS);
    if (questions.length === 0) return [];
    return [
      {
        key,
        topic: fr.productionCall.topicLabels[key],
        minutes: topicMinutes(questions.length),
        questions,
      },
    ];
  });
}

/** The call's objective, proposed from the topics (the person rewrites it). */
export function productionCallPurpose(
  deliverableTitle: string,
  topics: ProductionCallTopic[],
): string {
  const t = fr.productionCall;
  return topics.length
    ? t.purpose(
        deliverableTitle,
        topics.map((topic) => topic.topic.toLowerCase()),
      )
    : t.purposeReview(deliverableTitle);
}

/** Who PO proposes: the deliverable's owner, the director, the assigned people. */
export function productionCallPeople(
  data: Pick<
    ProductionSheetData,
    "deliverable" | "sheet" | "needs" | "ownerName"
  >,
): string[] {
  const names = [
    data.ownerName,
    data.deliverable.assigneeName,
    data.sheet?.director?.name ?? null,
    ...data.needs.flatMap((need) => filling(need).map((a) => a.holder.name)),
  ].filter((name): name is string => Boolean(name?.trim()) && name !== "—");
  return [...new Set(names)];
}

/**
 * What the panel opens with, from the sheet as loadProductionSheet read it.
 * Null without a sheet: there is nothing to organize yet.
 */
export function productionCallSheetData(
  data: Pick<
    ProductionSheetData,
    "deliverable" | "sheet" | "needs" | "ownerName"
  >,
): ProductionCallSheetData | null {
  if (!data.sheet) return null;
  const topics = productionCallTopics(data);
  return {
    sheetId: data.sheet.id,
    deliverableId: data.deliverable.id,
    deliverableTitle: data.deliverable.title,
    topics,
    purpose: productionCallPurpose(data.deliverable.title, topics),
    people: productionCallPeople(data),
  };
}
