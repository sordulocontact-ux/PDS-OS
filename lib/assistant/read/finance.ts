import "server-only";

import { tool } from "ai";
import { z } from "zod";

import { readBudgets, readNoProof } from "@/lib/assistant/read/finance-budgets";
import {
  readIncomes,
  readToPay,
  readTreasury,
} from "@/lib/assistant/read/finance-cash";
import { readOrchard } from "@/lib/assistant/read/finance-orchard";
import { readFailed, type ReadResult } from "@/lib/assistant/read/target";
import { can, type Access } from "@/lib/auth/access";
import { assistantReadFinance } from "@/lib/i18n/fr/assistant-read-finance";

const fr = { assistantReadFinance };

export const FINANCE_SUBJECTS = [
  "tresorerie",
  "encaissements",
  "a_payer",
  "budgets",
  "justificatifs",
  "the_orchard",
] as const;
type Subject = (typeof FINANCE_SUBJECTS)[number];

/** Finance read as its pages compute it, for whoever reads Finance. */
export async function readFinance(
  access: Access,
  subject: Subject,
  options: { horizon?: number; envelope?: string },
): Promise<ReadResult> {
  if (!can(access, "read_finance"))
    return { facts: [fr.assistantReadFinance.hidden], sources: [] };
  switch (subject) {
    case "tresorerie":
      return readTreasury(options.horizon ?? 90);
    case "encaissements":
      return readIncomes();
    case "a_payer":
      return readToPay(options.horizon ?? 30);
    case "budgets":
      return readBudgets(options.envelope);
    case "justificatifs":
      return readNoProof();
    case "the_orchard":
      return readOrchard();
  }
}

export function financeTool(access: Access) {
  return tool({
    description:
      "Lit la Finance du label (direction et Finance seulement), calculée par l'application : « tresorerie » = solde du compte, solde prévu, point bas et réserve sur 1, 3 ou 6 mois ou 1 an, et les mouvements qui y mènent ; « encaissements » = entrées d'argent et factures clients en retard (jours de retard, dernière relance) et à venir ; « a_payer » = dépenses à payer d'ici l'horizon ; « budgets » = une enveloppe nommée (projet, artiste ou centre de coût : montant, engagé, reste ou dépassement) ou toutes les enveloppes ; « justificatifs » = dépenses facturées ou payées sans justificatif ; « the_orchard » = le contrat The Orchard : montant, avances reçues et reste, titres livrés (comptés par la Distribution depuis le début du contrat, plus ceux saisis hors PDS OS), combien il en manque pour la prochaine avance, avance attendue, prochaine avance prévue et dépôts comptés. À appeler pour « point bas de trésorerie », « factures en retard », « combien il reste sur J4Y », « qu'est-ce qu'on doit payer ce mois-ci », « combien de sons avant la prochaine avance Orchard ? », « on a touché combien de The Orchard ? ».",
    inputSchema: z.object({
      subject: z.enum(FINANCE_SUBJECTS),
      horizon: z
        .number()
        .int()
        .optional()
        .describe(
          "Horizon en jours pour tresorerie et a_payer : 30 (1 mois), 90 (3 mois), 180 (6 mois) ou 365 (1 an) ; 90 par défaut pour la trésorerie, 30 pour à payer",
        ),
      envelope: z
        .string()
        .max(100)
        .optional()
        .describe(
          "Pour budgets : nom du projet, de l'artiste ou du centre de coût ; absent pour toutes les enveloppes",
        ),
    }),
    execute: async ({ subject, horizon, envelope }) => {
      try {
        return await readFinance(access, subject, { horizon, envelope });
      } catch (error) {
        console.error("readFinance:", error);
        return readFailed();
      }
    },
  });
}
