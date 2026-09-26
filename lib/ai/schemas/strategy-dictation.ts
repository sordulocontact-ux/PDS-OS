import { z } from "zod";

import { NEED_FAMILIES } from "@/lib/ai/schemas/call-report";

/**
 * Changes to the Launch strategy heard in a dictation. Closed: the model can
 * only set a Strategy text field or add a lever (label and family). Lever
 * states, deliverables, milestones and dates are out of reach on purpose: a
 * person decides them, and the calendar is entered by hand.
 */

const quote = z
  .string()
  .describe(
    "Extrait mot pour mot de la dictée qui justifie le changement. Recopier exactement, sans reformuler.",
  );

// Null or left out: on a short dictation the model omits the fields it did
// not hear instead of writing null (tested 2026-09-26 on the framing).
const field = (what: string) =>
  z
    .object({
      value: z
        .string()
        .describe(
          "Nouvelle valeur complète du champ, qui remplace la valeur actuelle.",
        ),
      quote,
    })
    .nullish()
    .describe(`${what} Null si non dicté.`);

// Same lessons as lib/ai/schemas/framing-dictation.ts: a leading free-text
// field (`request`) or ministral-14b answers the schema itself, and a flat
// shape or it closes a wrapper object too early.
export const strategyDictationSchema = z.object({
  request: z
    .string()
    .describe(
      "Ce que la dictée demande, en une phrase. Si elle ne demande aucun changement de la Stratégie, le dire.",
    ),
  positioning: field(
    "Positionnement : comment la sortie se situe, ce qui la distingue.",
  ),
  audiences: field("Publics visés par la sortie."),
  narrative: field("Narratif : l'histoire racontée autour de la sortie."),
  levers: z
    .array(
      z.object({
        label: z.string().describe("Le levier, en quelques mots."),
        family: z.enum(NEED_FAMILIES),
        quote,
      }),
    )
    .default([])
    .describe("Leviers de lancement à ajouter. Pas ceux qui existent déjà."),
});

export type StrategyDictation = z.infer<typeof strategyDictationSchema>;
