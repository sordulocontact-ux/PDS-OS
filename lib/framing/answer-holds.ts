import { parseSaidBudgetStatus } from "@/lib/assistant/verbatim";
import type { QuestionKey } from "@/lib/framing/dimensions";

// The numbers of a text, spaces and separators removed (« 8 000 » = 8000).
const numbersOf = (text: string) =>
  (text.match(/\d[\d\s  .,]*/g) ?? []).map((n) => n.replace(/[\s  .,]/g, ""));

/**
 * Whether PO's reworded answer to a question of the Cadrage is held by the
 * passage it quotes, checked by code. The same rule after a call (analyse)
 * and for « M'aider à définir » (help), so the help never proposes what the
 * call reading rightly left out (Sacha 28/10/2026: a « nouveau home studio »
 * is not a spend).
 * - Numbers in the answer must be in its quote: « budget total 8 000 € »
 *   never becomes « 8 000 € engagés » (UX test of 09/10/2026).
 * - An engagement is a spend said committed or paid, never planned, never
 *   the project's envelope (`envelopeQuote`).
 */
export function answerHolds(
  key: QuestionKey,
  answer: string,
  quote: string,
  envelopeQuote: string | null = null,
): boolean {
  const said = new Set(numbersOf(quote));
  if (!numbersOf(answer).every((n) => said.has(n))) return false;
  if (key === "commitments") {
    const status = parseSaidBudgetStatus(quote);
    if (status === null || status === "planned") return false;
    if (envelopeQuote !== null && quote.trim() === envelopeQuote.trim())
      return false;
  }
  return true;
}
