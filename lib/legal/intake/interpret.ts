import "server-only";

import { legalIntakeInstructions } from "@/lib/ai/instructions/legal-intake";
import { extract } from "@/lib/ai/llm";
import {
  legalAgreementsSchema,
  legalContributorsSchema,
  legalPublisherSchema,
  legalThirdPartySchema,
} from "@/lib/ai/schemas/legal-intake";
import { verbatimFrom } from "@/lib/assistant/verbatim";
import { fr } from "@/lib/i18n/fr";
import type { ProposedFact, QuestionKey } from "@/lib/legal/intake/types";

export type Interpretation =
  | {
      ok: true;
      facts: ProposedFact[];
      // Items the model gave but the code could not find in the answer.
      dropped: number;
    }
  | { ok: false; error: "provider" };

const escape = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Distinct facts only (the same person and role named twice). */
function distinct(facts: ProposedFact[]): ProposedFact[] {
  const seen = new Set<string>();
  return facts.filter((fact) => {
    const key = JSON.stringify([fact.kind, fact.value]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Reads a free answer into proposed facts: the model proposes, the code
 * keeps a name, a work or a party only when it is written in the answer
 * (never invented), and the person reviews the result before anything is
 * kept (record_legal_answer). The answer is data, sent apart from the fixed
 * instructions.
 */
export async function interpretAnswer(
  key: QuestionKey,
  title: string | null,
  answer: string,
): Promise<Interpretation> {
  const question = fr.legal.intake.questions[key];
  const input = [
    `<context>\nQuestion : ${escape(question.ask(title ?? ""))}${
      title ? `\nTitre : ${escape(title)}` : ""
    }\n</context>`,
    `<answer>\n${escape(answer)}\n</answer>`,
  ].join("\n");
  const instructions = legalIntakeInstructions(key);
  const found = verbatimFrom([answer]);
  const quote = (text: string) => found.quote(text);

  try {
    let raw = 0;
    let facts: ProposedFact[] = [];
    if (key === "contributors") {
      const { output } = await extract(
        legalContributorsSchema,
        input,
        instructions,
      );
      raw = output.people.reduce((n, p) => n + p.roles.length, 0);
      facts = output.people.flatMap((person) => {
        const name = quote(person.name);
        if (!name) return [];
        return person.roles.map((role): ProposedFact => ({
          kind: "contribution",
          value: { name, role },
          quote: quote(person.quote),
        }));
      });
    } else if (key === "third_party") {
      const { output } = await extract(
        legalThirdPartySchema,
        input,
        instructions,
      );
      raw = output.elements.length;
      facts = output.elements.flatMap((item): ProposedFact[] => {
        const work = quote(item.work);
        if (!work) return [];
        return [
          {
            kind: "third_party",
            value: {
              element: item.element,
              work,
              author: item.author ? quote(item.author) : null,
            },
            quote: quote(item.quote),
          },
        ];
      });
      if (output.none && facts.length === 0)
        facts = [{ kind: "none", value: {}, quote: null }];
    } else if (key === "agreements") {
      const { output } = await extract(
        legalAgreementsSchema,
        input,
        instructions,
      );
      raw = output.agreements.length;
      facts = output.agreements.flatMap((item): ProposedFact[] => {
        const party = quote(item.party);
        if (!party) return [];
        return [
          {
            kind: "agreement",
            value: { party, type: item.type },
            quote: quote(item.quote),
          },
        ];
      });
      if (output.none && facts.length === 0)
        facts = [{ kind: "none", value: {}, quote: null }];
    } else {
      const { output } = await extract(
        legalPublisherSchema,
        input,
        instructions,
      );
      raw = output.publishers.length;
      facts = output.publishers.flatMap((item): ProposedFact[] => {
        const name = quote(item.name);
        if (!name) return [];
        return [
          { kind: "publisher", value: { name }, quote: quote(item.quote) },
        ];
      });
      if (output.none && facts.length === 0)
        facts = [{ kind: "none", value: {}, quote: null }];
    }
    // Counted before merging duplicates: only what the code refused.
    const real = facts.filter((fact) => fact.kind !== "none").length;
    return {
      ok: true,
      facts: distinct(facts),
      dropped: Math.max(0, raw - real),
    };
  } catch (error) {
    console.error("interpretAnswer:", error);
    return { ok: false, error: "provider" };
  }
}
