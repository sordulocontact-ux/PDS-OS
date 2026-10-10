import { z } from "zod";

/**
 * What PO reads in the report of a production call (the technical call):
 * points, each filed under a topic of the agenda (keys given in the data),
 * with its nature — décision, hypothèse, action proposée, point à arbitrer —
 * a short rewording and the verbatim passage it comes from. Never a date,
 * a state or a number of its own: the code keeps only what it can verify
 * (lib/production/preprod/fill-from-call.ts).
 */

// Same lessons as the other schemas: a leading free-text field (`request`),
// a flat shape, closed values as plain strings checked by code, and
// `.default([])` for the list.
export const productionCallItemsSchema = z.object({
  request: z
    .string()
    .describe(
      "En une phrase : ce que le compte rendu dit de la préparation du tournage.",
    ),
  items: z
    .array(
      z.object({
        topic: z
          .string()
          .describe(
            "Clé du sujet de l'ordre du jour, recopiée telle quelle (t1, t2…), ou « autres » si aucun ne convient.",
          ),
        kind: z
          .string()
          .describe(
            "Une seule valeur parmi : decision (arrêté), hypothesis (pressenti, à confirmer), action (quelque chose à faire), to_decide (personne n'a tranché).",
          ),
        text: z
          .string()
          .describe(
            "Le point en une phrase courte, fidèle à la source, sans rien ajouter.",
          ),
        source: z
          .string()
          .describe("Identifiant de la source, recopié tel quel."),
        quote: z
          .string()
          .describe(
            "Passage recopié mot pour mot de cette source qui justifie le point (au moins trois mots).",
          ),
      }),
    )
    .default([]),
});

export type ProductionCallItemsOutput = z.infer<
  typeof productionCallItemsSchema
>;
