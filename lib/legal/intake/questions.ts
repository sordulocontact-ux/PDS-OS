// Which questions the Cadrage juridique asks, in which order (ticket
// Juridique 01: « calculer la meilleure prochaine question à partir des
// exigences non satisfaites », « ne jamais redemander une information déjà
// fiable et réutilisable »). Pure: decided by code, never by the model.
//
// Each question answers a need named by the tickets (docs/ARCHITECTURE.md
// § 8 sexies):
//   contributors — Person / Contribution (Juridique 01), the creators the
//                  SACEM bulletin lists (Juridique 06);
//   third_party  — « La détection d'un élément tiers crée une Clearance »
//                  (Juridique 01); « un emprunt à une œuvre préexistante
//                  exige l'autorisation préalable des ayants droit »
//                  (bulletin SACEM 725, Juridique 06);
//   agreements   — AgreementNeed / LegalDocument (Juridique 01), « accords
//                  existants » (Cadrage, dimension Cadre juridique);
//   publisher    — « Éditeurs 1 à 3 ← Organization + PublishingAgreement »
//                  (Juridique 06).

import { knownAnswer, type KnownPerson } from "@/lib/legal/intake/known-people";
import { legal } from "@/lib/i18n/fr/legal";
import type {
  IntakeQuestion,
  NotAskedQuestion,
  ProposedFact,
  QuestionKey,
} from "@/lib/legal/intake/types";

const fr = { legal };

export type IntakeKnowledge = {
  // The project's titles, in its order.
  titles: Array<{ id: string; title: string }>;
  // Titles whose credits already name contributors (the catalog is
  // reliable: the people question is not asked).
  creditedTitles: Set<string>;
  // Titles whose publishing split already names a publisher.
  publishedTitles: Set<string>;
  // A contract is attached to the project.
  hasContract: boolean;
  // The last answer and its active facts, by question and title.
  answers: Map<string, { text: string; facts: ProposedFact[] }>;
  // What the Cadrage established, by question and title (answerKey).
  cadrage: Map<string, string>;
  // Who each title and the Cadrage already name, by title.
  known: Map<string, KnownPerson[]>;
};

export const answerKey = (key: QuestionKey, masterId: string | null) =>
  `${key}:${masterId ?? "project"}`;

/**
 * Every question still relevant, in the order they are asked: for each
 * title, its people then any borrowed element (what everything else depends
 * on, and what may block the release); then the project's agreements; then
 * each title's publisher. A question settled by reliable data is left out;
 * one settled by an answer stays, answered, so it can be corrected.
 */
export function intakeQuestions(k: IntakeKnowledge): IntakeQuestion[] {
  const question = (
    key: QuestionKey,
    title: { id: string; title: string } | null,
  ): IntakeQuestion => {
    const id = answerKey(key, title?.id ?? null);
    const answer = k.answers.get(id);
    const people =
      key === "contributors" && title ? (k.known.get(title.id) ?? []) : [];
    const fromCadrage = k.cadrage.get(id) ?? null;
    const suggestion = answer
      ? null
      : people.length > 0
        ? knownAnswer(people)
        : fromCadrage;
    return {
      key,
      masterId: title?.id ?? null,
      title: title?.title ?? null,
      answered: answer !== undefined,
      lastAnswer: answer?.text ?? null,
      facts: answer?.facts ?? [],
      suggestion,
      suggestionFrom:
        suggestion === null ? null : people.length > 0 ? "known" : "cadrage",
    };
  };
  const answeredOr = (
    key: QuestionKey,
    title: { id: string; title: string } | null,
    known: boolean,
  ): IntakeQuestion[] => {
    const q = question(key, title);
    return known && !q.answered ? [] : [q];
  };

  return [
    ...k.titles.flatMap((title) => [
      ...answeredOr("contributors", title, k.creditedTitles.has(title.id)),
      question("third_party", title),
    ]),
    ...answeredOr("agreements", null, k.hasContract),
    ...k.titles.flatMap((title) =>
      answeredOr("publisher", title, k.publishedTitles.has(title.id)),
    ),
  ];
}

/** The questions reliable data settles, left out of the conversation and
 * said with their source (proto « Questions que PO ne pose pas »). */
export function notAskedQuestions(k: IntakeKnowledge): NotAskedQuestion[] {
  const t = fr.legal.intake.notAsked;
  const unanswered = (key: QuestionKey, masterId: string | null) =>
    !k.answers.has(answerKey(key, masterId));
  return [
    ...k.titles
      .filter(
        (title) =>
          k.creditedTitles.has(title.id) &&
          unanswered("contributors", title.id),
      )
      .map((title) => ({
        key: "contributors" as const,
        masterId: title.id,
        title: title.title,
        value:
          (k.known.get(title.id) ?? []).map((p) => p.name).join(", ") || null,
        source: t.sources.credits,
      })),
    ...(k.hasContract && unanswered("agreements", null)
      ? [
          {
            key: "agreements" as const,
            masterId: null,
            title: null,
            value: null,
            source: t.sources.contracts,
          },
        ]
      : []),
    ...k.titles
      .filter(
        (title) =>
          k.publishedTitles.has(title.id) && unanswered("publisher", title.id),
      )
      .map((title) => ({
        key: "publisher" as const,
        masterId: title.id,
        title: title.title,
        value: null,
        source: t.sources.splits,
      })),
  ];
}
