import { z } from "zod";

/**
 * PO's wording of the week's summary of Finance (lot 7, docs/FINANCE-V2.md):
 * a few sentences written only from the facts the code gives, every figure
 * copied as written. The code checks it (lib/assistant/finance-brief/verify.ts)
 * and keeps its own sentence otherwise.
 */
// Same lesson as the other schemas: a leading free-text field (`request`)
// and a flat shape, or ministral-14b answers the schema itself.
export const financeBriefSchema = z.object({
  request: z
    .string()
    .describe("En une phrase : ce que le résumé doit dire en premier."),
  text: z
    .string()
    .describe(
      "Le résumé de la semaine : 2 ou 3 phrases courtes en français, texte simple, chaque chiffre et chaque date recopiés exactement comme dans les faits.",
    ),
});

export type FinanceBriefOutput = z.infer<typeof financeBriefSchema>;
