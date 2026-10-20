"use server";

import { z } from "zod";

import { ANSWER_READING_INSTRUCTIONS } from "@/lib/ai/instructions/answer-reading";
import { extract } from "@/lib/ai/llm";
import { aiQuotaMessage, takeAiRequest } from "@/lib/ai/quota";
import { answerReadingSchema } from "@/lib/ai/schemas/answer-reading";
import { verbatimFrom } from "@/lib/assistant/verbatim";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";

export type ReadItem = {
  group: "direction" | "references" | "constraints";
  label: string;
  quote: string;
};

/**
 * « Lire ma réponse » (proto `daQuestion`, VISION-UX rule 12): PO reads
 * the creative director's answer and proposes the direction, references
 * and constraints, each with its quote. Only an item whose quote is found
 * word for word in her answer is kept, by the code; nothing is saved here.
 */
export async function readDirectionAnswer(
  text: string,
): Promise<{ ok: true; items: ReadItem[] } | { ok: false; error: string }> {
  const t = fr.masterWorkflow.questions;
  const answer = z.string().trim().min(1).max(2000).safeParse(text);
  if (!answer.success) return { ok: false, error: t.errors.empty };
  await requireApproved();
  try {
    await takeAiRequest();
    const { output } = await extract(
      answerReadingSchema,
      answer.data,
      ANSWER_READING_INSTRUCTIONS,
    );
    const said = verbatimFrom([answer.data]);
    const seen = new Set<string>();
    const items = output.items.flatMap((item): ReadItem[] => {
      const quote = said.quote(item.quote);
      const label = item.label.trim().slice(0, 200);
      const key = `${item.group}:${label.toLowerCase()}`;
      if (!quote || quote.length < 3 || !label || seen.has(key)) return [];
      seen.add(key);
      return [{ group: item.group, label, quote }];
    });
    return { ok: true, items };
  } catch (error) {
    console.error("readDirectionAnswer:", error);
    return {
      ok: false,
      error: aiQuotaMessage(error) ?? fr.masterAnswer.readFailed,
    };
  }
}
