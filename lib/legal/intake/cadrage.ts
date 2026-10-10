// What the Cadrage already established for the legal questions (UX test of
// 09/10/2026: PO asked again what the Cadrage said — a sample, no
// agreement). Pure code: the Cadrage's confirmed words become the answer
// offered on the question, still read by PO and kept by a person.
//
//   third_party (per title) ← the rights constraints of the Cadrage that
//     name the title (any of them on a single-title project), or « none »
//     when the Cadrage settled that there is no blocker;
//   agreements ← the Cadrage's existing agreements, or « none ».

import { fr } from "@/lib/i18n/fr";
import { answerKey } from "@/lib/legal/intake/questions";
import { normalizeSearch } from "@/lib/utils/search";

export type CadrageLegal = {
  // Confirmed rights constraints (framing_constraints, type rights).
  constraints: string[];
  // Confirmed Brief values of the legal dimension, by field key: a text,
  // or {"none": true} when the Cadrage answered « aucun ».
  fields: Map<string, unknown>;
};

const isNone = (value: unknown) =>
  typeof value === "object" &&
  value !== null &&
  (value as { none?: unknown }).none === true;

export function cadrageAnswers(
  titles: Array<{ id: string; title: string }>,
  cadrage: CadrageLegal,
): Map<string, string> {
  const t = fr.legal.intake.cadrageNone;
  const answers = new Map<string, string>();
  const blockers = cadrage.fields.get("legal_blockers");
  for (const title of titles) {
    const name = normalizeSearch(title.title);
    const named = cadrage.constraints.filter(
      (text) =>
        titles.length === 1 || (name && normalizeSearch(text).includes(name)),
    );
    if (named.length > 0)
      answers.set(answerKey("third_party", title.id), named.join("\n"));
    else if (isNone(blockers) && cadrage.constraints.length === 0)
      answers.set(answerKey("third_party", title.id), t.third_party);
  }
  const agreements = cadrage.fields.get("legal_agreements");
  if (typeof agreements === "string" && agreements.trim())
    answers.set(answerKey("agreements", null), agreements.trim());
  else if (isNone(agreements))
    answers.set(answerKey("agreements", null), t.agreements);
  return answers;
}
