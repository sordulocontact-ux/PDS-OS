// The questions of the Brief Mix/Master asked to the right people
// (master_brief_questions, docs/ARCHITECTURE.md § 8 septies, lot 9).
// Client-safe; the lists mirror the database checks.

import { routes } from "@/lib/auth/redirects";
import type {
  BriefDeliverable,
  BriefPerson,
} from "@/lib/master-workflow/brief-types";

/** What is asked: the artistic direction, the other deliverables. */
export const QUESTION_DIMENSIONS = ["direction", "deliverables"] as const;
export type QuestionDimension = (typeof QUESTION_DIMENSIONS)[number];

/** The deliverables a question may add (the two masters always are). */
export const QUESTION_DELIVERABLES = [
  "instrumental",
  "acapella",
  "clean",
  "radio_edit",
  "live",
  "tv_mix",
  "stems",
] as const satisfies readonly BriefDeliverable[];
export type QuestionDeliverable = (typeof QUESTION_DELIVERABLES)[number];

export function questionDeliverablesOf(values: readonly string[]) {
  return values.filter((value): value is QuestionDeliverable =>
    (QUESTION_DELIVERABLES as readonly string[]).includes(value),
  );
}

export type BriefQuestion = {
  id: string;
  dimension: QuestionDimension;
  askedTo: BriefPerson;
  askedAt: string;
  answerText: string | null;
  // [] = « rien d'autre » for the deliverables.
  answerChoices: QuestionDeliverable[] | null;
  // What PO read in a direction answer, each item with its words (rule 12).
  answerItems: AnswerItem[] | null;
  answeredAt: string | null;
  appliedAt: string | null;
  // Asked to the viewer: they answer it.
  isMine: boolean;
};

export type AnswerItem = {
  group: "direction" | "references" | "constraints";
  label: string;
  quote: string;
};

/** The items stored with an answer (jsonb), the malformed ones left out. */
export function answerItemsOf(value: unknown): AnswerItem[] | null {
  if (!Array.isArray(value)) return null;
  return value.flatMap((x): AnswerItem[] => {
    const i = x as Partial<AnswerItem> | null;
    return i &&
      (i.group === "direction" ||
        i.group === "references" ||
        i.group === "constraints") &&
      typeof i.label === "string" &&
      typeof i.quote === "string"
      ? [{ group: i.group, label: i.label, quote: i.quote }]
      : [];
  });
}

/** Who should be asked what, decided by code (questions-plan.ts). */
export type QuestionToAsk = {
  dimension: QuestionDimension;
  people: BriefPerson[];
};

export type BriefQuestionsView = {
  questions: BriefQuestion[];
  toAsk: QuestionToAsk[];
  // The project's owner: asks and applies the answers.
  canAsk: boolean;
  // No creative director on the project: nobody else to ask.
  noCreatives: boolean;
  failed: boolean;
};

// "done": answered « rien d'autre », nothing to put in the brief.
export type QuestionState = "open" | "answered" | "applied" | "done";

/** Where a question stands. */
export function questionStateOf(question: BriefQuestion): QuestionState {
  if (!question.answeredAt) return "open";
  if (question.appliedAt) return "applied";
  return question.answerChoices?.length === 0 ? "done" : "answered";
}

/** Where the task of a question leads: the questions of the brief. */
export const questionTaskHref = (projectId: string) =>
  `${routes.projectMasterStep(projectId, "brief")}#brief-questions`;
