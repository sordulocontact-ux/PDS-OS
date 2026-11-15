import { z } from "zod";

/**
 * Reading a proof (a ticket, an invoice) dropped in Finance › Justificatifs.
 * A proposal only: every value is copied as written, never computed; the
 * code keeps it « verified » only when it finds the copy in the PDF's text
 * (lib/finance/proof-verify.ts), and a photo is always checked by a person.
 */
const quote = (what: string) =>
  z
    .string()
    .nullish()
    .describe(
      `${what}, recopié(e) exactement comme écrit sur le document (chiffres, virgules, symboles compris). null s'il n'est pas écrit.`,
    );

export const receiptReadingSchema = z.object({
  kind: z
    .enum(["receipt", "invoice", "other"])
    .describe(
      "receipt : ticket de caisse ou reçu ; invoice : facture d'un fournisseur ; other : tout autre document (contrat, devis, relance, publicité).",
    ),
  vendor: quote(
    "Le nom du fournisseur ou du commerçant qui a émis le document",
  ),
  total: quote(
    "Le montant total TTC à payer (« Total », « Net à payer », « Total TTC »), sans calcul",
  ),
  vat: quote("Le montant total de la TVA, s'il est écrit"),
  date: quote("La date d'émission du document (pas une échéance)"),
  reference: quote("Le numéro de la facture ou du ticket"),
});

export type ReceiptReading = z.infer<typeof receiptReadingSchema>;
