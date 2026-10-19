// Cadrage juridique (ticket Juridique 01): the questions, and the facts a
// free answer turns into. Client-safe: the review screen and the server
// action share these shapes.

import { z } from "zod";

import { CONTRIBUTOR_ROLES } from "@/lib/catalog/master/rules";
import { CONTRACT_TYPES } from "@/lib/contracts/types";

export const QUESTION_KEYS = [
  "contributors",
  "third_party",
  "agreements",
  "publisher",
] as const;
export type QuestionKey = (typeof QUESTION_KEYS)[number];

// Mirrors legal_clearances.element.
export const THIRD_PARTY_ELEMENTS = [
  "topline",
  "sample",
  "interpolation",
  "cover",
  "other",
] as const;
export type ThirdPartyElement = (typeof THIRD_PARTY_ELEMENTS)[number];

// A credit role of the catalog, or a performance (which the catalog keeps
// on its artists: noted as a fact, never turned into a credit here).
export const PERSON_ROLES = [...CONTRIBUTOR_ROLES, "performer"] as const;
export type PersonRole = (typeof PERSON_ROLES)[number];

/** What a fact says, by kind (legal_facts.kind / value). */
export const factValueSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("contribution"),
    value: z.object({
      name: z.string().trim().min(1).max(200),
      role: z.enum(PERSON_ROLES),
    }),
  }),
  z.object({
    kind: z.literal("third_party"),
    value: z.object({
      element: z.enum(THIRD_PARTY_ELEMENTS),
      work: z.string().trim().min(1).max(300),
      author: z.string().trim().min(1).max(300).nullable(),
    }),
  }),
  z.object({
    kind: z.literal("agreement"),
    value: z.object({
      party: z.string().trim().min(1).max(200),
      type: z.enum(CONTRACT_TYPES),
    }),
  }),
  z.object({
    kind: z.literal("publisher"),
    value: z.object({ name: z.string().trim().min(1).max(200) }),
  }),
  // The answer says there is nothing (no third-party element, no
  // agreement, no publisher): an answer too, the question is settled.
  z.object({ kind: z.literal("none"), value: z.object({}) }),
]);
export type FactValue = z.infer<typeof factValueSchema>;

/** A fact PO read in an answer, before the person keeps it. */
export type ProposedFact = FactValue & {
  // The words of the answer it comes from, found verbatim by the code.
  quote: string | null;
};

/** One question, for one title or for the whole project. */
export type IntakeQuestion = {
  key: QuestionKey;
  // Null for the project-wide question (agreements).
  masterId: string | null;
  title: string | null;
  // Settled by an answer (open = still to ask).
  answered: boolean;
  // The last answer, kept to correct it.
  lastAnswer: string | null;
  // The facts of the last answer that are still active, with the words
  // they came from.
  facts: ProposedFact[];
  // What the Cadrage already established, offered as the answer while the
  // question is open (UX test of 09/10/2026: PO asked it again); null if
  // the Cadrage says nothing about it. On the people question, the people
  // the title and the Cadrage already name (known-people.ts).
  suggestion: string | null;
  // Where the suggestion comes from: the question and its help change when
  // some people are already known.
  suggestionFrom: "cadrage" | "known" | null;
};

/** Questions a « nothing » answer settles (« Aucun emprunt »…). */
export const NONE_QUESTIONS: readonly QuestionKey[] = [
  "third_party",
  "agreements",
  "publisher",
];

/** A question PO does not ask: reliable data already settles it
 * (« Questions que PO ne pose pas »), with what it says and where from. */
export type NotAskedQuestion = {
  key: QuestionKey;
  masterId: string | null;
  title: string | null;
  // What the data says, when it can be said (« Mona Lys, Karim Haddou »).
  value: string | null;
  source: string;
};
