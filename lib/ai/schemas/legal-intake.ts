import { z } from "zod";

import { CONTRACT_TYPES } from "@/lib/contracts/types";
import { PERSON_ROLES, THIRD_PARTY_ELEMENTS } from "@/lib/legal/intake/types";

/**
 * What PO reads in a free answer of the Cadrage juridique, one schema per
 * question. The model proposes, the code keeps only what it finds verbatim
 * in the answer (names, works, parties) and the person reviews everything
 * before it is kept (ticket Juridique 01).
 */

const quote = z
  .string()
  .describe(
    "Passage de la réponse recopié mot pour mot qui justifie cet élément.",
  );

export const legalContributorsSchema = z.object({
  people: z
    .array(
      z.object({
        name: z
          .string()
          .describe("Le nom tel qu'il est écrit dans la réponse."),
        roles: z
          .array(z.enum(PERSON_ROLES))
          .min(1)
          .describe(
            "Ses rôles sur ce titre : composer (composition, musique), lyricist (texte, paroles, topline écrite), arranger, producer (réalisation, production), co_producer, recording_engineer (enregistrement), mix_engineer, mastering_engineer, musician (instrument), performer (chant, interprétation), other.",
          ),
        quote,
      }),
    )
    .max(20)
    .default([]),
});

export const legalThirdPartySchema = z.object({
  none: z
    .boolean()
    .describe("Vrai si la réponse dit qu'aucun élément n'est repris."),
  elements: z
    .array(
      z.object({
        element: z
          .enum(THIRD_PARTY_ELEMENTS)
          .describe(
            "topline (mélodie ou texte repris), sample (extrait d'enregistrement), interpolation (mélodie rejouée), cover (reprise du titre entier), other.",
          ),
        work: z
          .string()
          .describe(
            "L'œuvre reprise, telle qu'elle est écrite dans la réponse.",
          ),
        author: z
          .string()
          .nullable()
          .describe(
            "Son auteur ou artiste s'il est écrit dans la réponse, sinon null.",
          ),
        quote,
      }),
    )
    .max(10)
    .default([]),
});

export const legalAgreementsSchema = z.object({
  none: z
    .boolean()
    .describe("Vrai si la réponse dit qu'aucun accord n'existe."),
  agreements: z
    .array(
      z.object({
        party: z
          .string()
          .describe(
            "L'autre partie (personne ou structure), telle qu'elle est écrite.",
          ),
        type: z
          .enum(CONTRACT_TYPES)
          .describe(
            "artist (contrat d'artiste), license, distribution, publishing (édition), coproduction, image_rights, service (prestation), partnership, other.",
          ),
        quote,
      }),
    )
    .max(10)
    .default([]),
});

export const legalPublisherSchema = z.object({
  none: z
    .boolean()
    .describe("Vrai si la réponse dit que l'œuvre n'a pas d'éditeur."),
  publishers: z
    .array(
      z.object({
        name: z.string().describe("Le nom de l'éditeur, tel qu'il est écrit."),
        quote,
      }),
    )
    .max(3)
    .default([]),
});
