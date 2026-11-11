import { z } from "zod";

/**
 * What PO reads in the transcript of a deal's call (BIZ 6): the terms whose
 * value was said, a stage the negotiation reached, the next action. Each with
 * the verbatim passage it comes from. Never a value, a date or a number of
 * its own: the code keeps only what it finds in the passage
 * (lib/deals/call-proposals.ts), and a person confirms every proposal in the
 * deal's real forms.
 */

// Same lessons as the other schemas: a leading free-text field (`request`),
// a flat shape, closed values as plain strings checked by code, and
// `.default([])` for the lists.
export const dealCallProposalsSchema = z.object({
  request: z
    .string()
    .describe("En une phrase : ce que le call dit de la négociation."),
  terms: z
    .array(
      z.object({
        term: z
          .string()
          .describe(
            "Clé d'un terme de <terms>, recopiée telle quelle (advance, royalties…).",
          ),
        value: z
          .string()
          .describe(
            "La valeur telle qu'elle a été dite, en peu de mots (« 25 % », « 2 000 € », « Monde », « 12 mois »).",
          ),
        mode: z
          .string()
          .describe(
            "Pour un montant seulement : advance (avance) ou fee (cachet) ; sinon vide.",
          ),
        yes: z
          .string()
          .describe("Pour un oui/non seulement : yes ou no ; sinon vide."),
        parts: z
          .array(
            z.object({
              role: z
                .string()
                .describe(
                  "author, composer, author_composer, arranger, publisher ou other.",
                ),
              percent: z.string().describe("Le pourcentage dit (« 25 »)."),
            }),
          )
          .default([])
          .describe("Pour une répartition seulement ; sinon vide."),
        stance: z
          .string()
          .describe(
            "Une seule valeur : pds (proposé par PDS), counter (contre-proposition de l'autre partie), agreed (accepté par les deux).",
          ),
        quote: z
          .string()
          .describe(
            "Passage recopié mot pour mot de la transcription, où la valeur est dite.",
          ),
      }),
    )
    .default([]),
  stage: z
    .string()
    .describe(
      "Clé d'une étape de <stages> que la négociation a clairement atteinte pendant le call, ou vide.",
    ),
  stageQuote: z
    .string()
    .describe("Passage recopié mot pour mot qui le montre, ou vide."),
  nextAction: z
    .string()
    .describe(
      "La prochaine action convenue pendant le call, en une phrase courte, ou vide.",
    ),
  nextActionWhen: z
    .string()
    .describe(
      "Le jour de cette action tel qu'il a été dit (« le 14 mars 2027 », « vendredi »), ou vide.",
    ),
  nextActionQuote: z
    .string()
    .describe(
      "Passage recopié mot pour mot où l'action est convenue, ou vide.",
    ),
});

export type DealCallProposalsOutput = z.infer<typeof dealCallProposalsSchema>;
