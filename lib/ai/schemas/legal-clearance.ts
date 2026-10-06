import { z } from "zod";

import { HOLDER_ROLES, RIGHT_KINDS } from "@/lib/legal/clearance/matrix";

/**
 * What PO reads in a free message about a clearance (ticket Juridique 05,
 * « Justine peut écrire librement ce qui s'est passé ; PO propose la mise à
 * jour »). The model only reads: the code keeps a name, an amount or a
 * condition when it is written in the message, chooses the state to
 * propose itself, and the person applies each proposal.
 */

const quote = z
  .string()
  .describe(
    "Passage du message recopié mot pour mot qui justifie cet élément.",
  );

export const clearanceMessageSchema = z.object({
  event: z
    .enum([
      "new_contact",
      "call_planned",
      "conditions_received",
      "counter_proposal",
      "agreement",
      "contract_received",
      "refusal",
      "other",
    ])
    .describe(
      "Ce que raconte le message, au mieux ; other s'il ne dit rien de cela.",
    ),
  outgoing: z
    .boolean()
    .describe(
      "Vrai si le message raconte un envoi de l'équipe vers l'extérieur.",
    ),
  rightsholders: z
    .array(
      z.object({
        name: z
          .string()
          .describe("Le nom tel qu'il est écrit dans le message."),
        role: z.enum(HOLDER_ROLES),
        right: z
          .enum(RIGHT_KINDS)
          .describe(
            "work : l'œuvre (édition, auteurs) ; master : l'enregistrement.",
          ),
        quote,
      }),
    )
    .describe("Les ayants droit ou interlocuteurs nommés dans le message."),
  terms: z
    .object({
      amount: z
        .string()
        .nullable()
        .describe("Le montant tel qu'il est écrit (« 500 € »), ou null."),
      share: z
        .string()
        .nullable()
        .describe("La part demandée telle qu'elle est écrite, ou null."),
      credits: z.string().nullable(),
      territory: z.string().nullable(),
      duration: z.string().nullable(),
    })
    .nullable()
    .describe(
      "Les conditions reçues, recopiées telles quelles ; null s'il n'y en a pas.",
    ),
});
