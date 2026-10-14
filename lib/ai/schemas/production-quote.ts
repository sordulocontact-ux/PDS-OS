import { z } from "zod";

/**
 * What PO reads in a rental quote (Production › Matériel, PROD-014): the
 * supplier, the deposit, the conditions and each line, every value with the
 * verbatim passage it comes from. Amounts and quantities are copied as
 * written; the code keeps only what it finds in the quote
 * (lib/production/preprod/quote-verify.ts).
 */

const quote = z
  .string()
  .describe(
    "Passage recopié mot pour mot du devis qui justifie la valeur (au moins trois mots). Recopier exactement.",
  );

const field = (what: string) =>
  z
    .object({ value: z.string().describe(`${what}, recopié tel quel.`), quote })
    .nullish()
    .describe(`${what}. Null si le devis ne le dit pas.`);

export const productionQuoteSchema = z.object({
  supplier: field("Le nom du loueur ou du fournisseur"),
  deposit: field("Le montant de la caution, avec son unité"),
  conditions: field(
    "Les conditions de retrait et de retour (horaires, lieu, retard, casse), en une ou deux phrases fidèles",
  ),
  taxes: field("Ce que le devis dit des taxes (HT, TTC, TVA)"),
  lines: z
    .array(
      z.object({
        label: z
          .string()
          .describe("L'article, tel qu'écrit sur le devis (marque, modèle)."),
        category: z
          .string()
          .describe(
            "Une seule valeur : image (caméra, optique, machinerie), light (lumière), sound (son), other.",
          ),
        quantity: z
          .string()
          .nullish()
          .describe("La quantité, recopiée telle quelle. Null si absente."),
        price: z
          .string()
          .nullish()
          .describe(
            "Le prix total de la ligne s'il est écrit, sinon le prix unitaire, recopié tel quel avec son unité. Null si absent.",
          ),
        quote,
      }),
    )
    .describe("Une entrée par ligne d'article du devis, dans l'ordre."),
});

export type ProductionQuoteOutput = z.infer<typeof productionQuoteSchema>;
