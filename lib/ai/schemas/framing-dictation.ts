import { z } from "zod";

import { NEED_FAMILIES } from "@/lib/ai/schemas/call-report";

/**
 * Changes to the Framing stage heard in a dictation. Closed: the model can
 * only set a Brief text field or add a need, a team member or an open point.
 * Tasks (an owner and a due date, chosen by a person) and the stage state
 * (SQL functions) are out of reach on purpose.
 */

const quote = z
  .string()
  .describe(
    "Extrait mot pour mot de la dictée qui justifie le changement. Recopier exactement, sans reformuler.",
  );

const field = z
  .object({
    value: z
      .string()
      .describe(
        "Nouvelle valeur complète du champ, qui remplace la valeur actuelle.",
      ),
    quote,
  })
  .nullable();

const changes = z.object({
  brief: z
    .object({
      objective: field.describe("Objectif de la sortie, ou null si non dicté."),
      timing: field.describe(
        "Temporalité telle qu'énoncée (ex. « début mars »). Ne jamais convertir en date. Null si non dictée.",
      ),
      frame: field.describe(
        "Cadre : contraintes de budget, juridiques, artistiques. Null si non dicté.",
      ),
    })
    .nullable()
    .describe("Null si aucun champ du Brief n'est dicté."),
  needs: z
    .array(
      z.object({ label: z.string(), family: z.enum(NEED_FAMILIES), quote }),
    )
    .describe("Besoins à ajouter. Pas ceux qui existent déjà."),
  team: z
    .array(z.object({ name: z.string(), role: z.string().nullable(), quote }))
    .describe("Personnes à ajouter à l'équipe. Pas celles déjà présentes."),
  openPoints: z
    .array(z.object({ question: z.string(), quote }))
    .describe("Questions à trancher à ajouter. Pas celles déjà ouvertes."),
});

// ministral-14b answers a schema made only of objects and arrays with the
// schema itself ({"type":"object","properties":…}), every time (tested
// 2026-09-26). A leading free-text field makes it answer the data. `request` is not shown: the user sees what
// was heard and the proposals.
export const framingDictationSchema = z.object({
  request: z
    .string()
    .describe(
      "Ce que la dictée demande, en une phrase. Si elle ne demande aucun changement du Brief, le dire.",
    ),
  changes,
});

export type FramingDictation = z.infer<typeof framingDictationSchema>;
