// « Préparer le call technique » (ticket, parcours 5): PO proposes the six
// topics of a technical call, each with the questions the preproduction
// still leaves open — computed by code from what is missing, plus the
// points to arbitrate and the hypotheses people recorded — the participants
// by function and the documents to have at hand. No model. Client-safe.

import { topicMinutes } from "@/lib/calls/prepare";
import { fr } from "@/lib/i18n/fr";
import { missingBriefTopics } from "@/lib/production/brief";
import type { EffectiveLogistics } from "@/lib/production/logistics";
import type { ProductionSheetData } from "@/lib/production/sheet";

import { multiRolePeople, staffingCounts, teamMembers } from "./team";
import type { PreprodData } from "./types";

export const TECHNICAL_TOPICS = [
  "direction",
  "sound",
  "location",
  "team",
  "equipment",
  "schedule_budget",
] as const;
export type TechnicalTopic = (typeof TECHNICAL_TOPICS)[number];

export type TechnicalTopicPrep = {
  key: TechnicalTopic;
  topic: string;
  minutes: number;
  questions: string[];
};

export type TechnicalCallInput = {
  data: Pick<
    ProductionSheetData,
    "deliverable" | "sheet" | "needs" | "ownerName" | "heritage"
  >;
  preprod: Pick<
    PreprodData,
    "items" | "equipment" | "budget" | "briefs" | "quotes"
  >;
  logistics: EffectiveLogistics;
};

const MAX_QUESTIONS = 8;
const t = fr.productionPreprod.call;

/** The label of a technical topic, as call items store it. */
export const technicalTopicLabel = (key: TechnicalTopic) => t.topics[key];

function gaps(
  key: TechnicalTopic,
  { data, preprod, logistics }: TechnicalCallInput,
) {
  const q = t.questions;
  const sheet = data.sheet;
  const missing = sheet ? missingBriefTopics(sheet.brief) : null;
  switch (key) {
    case "direction":
      return [
        sheet && !sheet.director ? q.director : null,
        missing?.coverage ? q.coverage : null,
        missing?.runOfShow ? q.runOfShow : null,
      ];
    case "sound":
      return [missing?.sound ? q.sound : null];
    case "location": {
      const status = sheet?.logistics.locationStatus ?? "to_find";
      return [
        status === "to_find" ? q.locationFind : null,
        status === "to_verify" ? q.locationVerify : null,
        !sheet?.logistics.locationAccess ? q.access : null,
        preprod.equipment.some((e) => e.category === "light") ? null : q.light,
      ];
    }
    case "team": {
      const counts = staffingCounts(data.needs);
      return [
        data.needs.length === 0 ? q.noTeam : null,
        counts.filled < counts.positions
          ? q.staffing(counts.positions - counts.filled)
          : null,
        counts.toConfirm > 0 ? q.availability(counts.toConfirm) : null,
        ...multiRolePeople(data.needs).map((p) =>
          q.multiRole(p.name, p.roles.join(", ")),
        ),
      ];
    }
    case "equipment": {
      const toVerify = preprod.equipment.filter(
        (e) => e.status === "to_verify",
      );
      return [
        preprod.equipment.length === 0 ? q.noEquipment : null,
        toVerify.length > 0 ? q.toVerify(toVerify.length) : null,
        preprod.equipment.some((e) => e.status === "need")
          ? q.needsQuotes
          : null,
      ];
    }
    case "schedule_budget": {
      const toEstimate = preprod.budget.filter(
        (l) => l.status === "to_estimate",
      );
      return [
        logistics.shootDate.value ? null : q.shootDate,
        logistics.deliveryDate.value ? null : q.deliveryDate,
        logistics.shootDate.diverges ? q.shootDiverges : null,
        logistics.budgetEnvelopeCents.value === null ? q.envelope : null,
        toEstimate.length > 0 ? q.toEstimate(toEstimate.length) : null,
      ];
    }
  }
}

/** The six topics, each with its open questions and approximate length. */
export function technicalCallTopics(
  input: TechnicalCallInput,
): TechnicalTopicPrep[] {
  const confirmed = input.preprod.items.filter((i) => i.status === "confirmed");
  return TECHNICAL_TOPICS.map((key) => {
    const label = technicalTopicLabel(key);
    const open = confirmed
      .filter(
        (i) =>
          i.topic === label &&
          (i.kind === "to_decide" || i.kind === "hypothesis"),
      )
      .map((i) =>
        i.kind === "to_decide"
          ? t.questions.toDecide(i.body)
          : t.questions.hypothesis(i.body),
      );
    const questions = [
      ...gaps(key, input).filter((x): x is string => x !== null),
      ...open,
    ].slice(0, MAX_QUESTIONS);
    return {
      key,
      topic: label,
      minutes: topicMinutes(Math.max(1, questions.length)),
      questions,
    };
  });
}

/** Participants by function: the owner, the director, each team member. */
export function technicalCallPeople(input: TechnicalCallInput): string[] {
  const { data } = input;
  const names = [
    data.ownerName ? t.person(data.ownerName, t.ownerRole) : null,
    data.sheet?.director
      ? t.person(data.sheet.director.name, t.directorRole)
      : null,
    ...teamMembers(data.needs).map((m) => t.person(m.holder.name, m.role)),
  ].filter((n): n is string => n !== null && !n.startsWith("—"));
  return [...new Set(names)].slice(0, 30);
}

/** The documents to have at hand, as the panel lists them. */
export function technicalCallDocuments(input: TechnicalCallInput): string[] {
  const { data, preprod } = input;
  return [
    data.heritage.fiche ? t.documents.fiche(data.heritage.fiche.version) : null,
    data.sheet?.briefUpdatedAt ? t.documents.directorBrief : null,
    ...preprod.briefs
      .filter((b) => b.transmittedAt)
      .map((b) =>
        t.documents.teamBrief(fr.productionPreprod.briefs.teams[b.team]),
      ),
    preprod.quotes.length > 0
      ? t.documents.quotes(preprod.quotes.length)
      : null,
  ].filter((d): d is string => d !== null);
}

export function technicalCallPurpose(deliverableTitle: string): string {
  return t.purpose(deliverableTitle);
}
