import { z } from "zod";

import { BRIEF_DELIVERABLES } from "@/lib/master-workflow/brief-types";

/**
 * Changes to the Brief Mix/Master heard in a dictation or in an exchange
 * (a call held to fill it). Closed: the model can only rewrite a text of the
 * artistic direction, add a deliverable from the list, name an engineer, say
 * whether the same person masters, and copy the words of a rate. It never
 * gives a number nor a date: a rate is the words said ("800 euros"), read
 * by code; the calendar and the revisions are entered by a person.
 */

const quote = z
  .string()
  .describe(
    "Extrait mot pour mot du texte qui justifie le changement. Recopier exactement, sans reformuler.",
  );

// Null or left out when not heard (same lesson as the strategy's schema).
// ministral-14b nests a text in its own value, sometimes without the outer
// quote ({"value": {"value": "…", "quote": "…"}}, seen 05/10/2026 on an
// exchange's references). Both shapes are accepted, plainly, in the schema
// the model sees; the adapter keeps the inner text (textOf).
const textValue = z
  .string()
  .describe(
    "Nouvelle valeur complète du champ, qui remplace la valeur actuelle.",
  );

const text = (what: string) =>
  z
    .object({
      value: z.union([
        textValue,
        z.object({ value: textValue, quote: quote.optional() }),
      ]),
      quote: quote.optional(),
    })
    .nullish()
    .describe(`${what} Null si rien n'est dit.`);

/** A text field as said, whatever its shape; null without a quote. */
export function textOf(
  field: z.infer<ReturnType<typeof text>>,
): { value: string; quote: string } | null {
  if (!field) return null;
  const nested = typeof field.value === "object" ? field.value : null;
  const value = nested ? nested.value : (field.value as string);
  const said = field.quote ?? nested?.quote;
  return said ? { value, quote: said } : null;
}

const engineer = (what: string) =>
  z
    .object({
      name: z
        .string()
        .describe("Le nom de la personne, tel qu'il est dit, sans titre."),
      quote,
    })
    .nullish()
    .describe(`${what} Null si personne n'est nommé.`);

const rate = (what: string) =>
  z
    .object({
      amount: z
        .string()
        .describe(
          "Le montant recopié mot pour mot tel qu'il est dit, chiffres et devise compris (« 800 euros », « 1 200 € »). Ne jamais le calculer ni le convertir.",
        ),
      quote,
    })
    .nullish()
    .describe(`${what} Null si aucun montant n'est dit.`);

// A leading free-text field (`request`) and a flat shape, as for the
// strategy: ministral-14b otherwise answers the schema itself.
export const masterBriefSchema = z.object({
  request: z
    .string()
    .describe(
      "Ce que le texte dit du mix et du mastering, en une phrase. S'il n'en dit rien, le dire.",
    ),
  references: text(
    "Références : titres ou artistes dont s'inspirer, avec ce qu'il faut y entendre.",
  ),
  direction: text("Direction artistique : ce que le son doit être."),
  constraints: text("Contraintes : ce qu'il faut éviter ou respecter."),
  mixEngineer: engineer("La personne qui mixe."),
  masteringEngineer: engineer("La personne qui masterise."),
  sameEngineer: z
    .object({ value: z.boolean(), quote })
    .nullish()
    .describe(
      "Vrai si la même personne fait le mix et le mastering, faux si c'est dit autrement. Null si rien n'est dit.",
    ),
  mixRate: rate("Le tarif du mix."),
  masteringRate: rate("Le tarif du mastering."),
  deliverables: z
    .array(z.object({ key: z.enum(BRIEF_DELIVERABLES), quote }))
    .default([])
    .describe(
      "Livrables demandés, à ajouter. Seulement ceux qui sont dits, pas ceux qui existent déjà.",
    ),
});

export type MasterBriefExtraction = z.infer<typeof masterBriefSchema>;
