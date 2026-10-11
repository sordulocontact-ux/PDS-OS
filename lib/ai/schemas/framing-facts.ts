import { z } from "zod";

import { NEED_FAMILIES } from "@/lib/ai/schemas/call-report";

/**
 * What a text says about the six dimensions of the Cadrage (the initial
 * context of a project, or a framing call's transcript). Kept flat (the
 * free model closes nested objects too early, docs/ARCHITECTURE.md § 12),
 * every field optional (it omits what was not said). Each element carries a
 * verbatim quote that code searches in the text; dates and amounts are only
 * quoted, never computed: code reads them (lib/framing/said.ts).
 */

const quote = z
  .string()
  .describe(
    "Extrait recopié mot pour mot du texte qui justifie l'élément (au moins cinq mots).",
  );

const fact = z
  .object({
    value: z.string().describe("Ce qui est dit, reformulé en une phrase."),
    quote,
  })
  .nullish();

export const DEADLINE_KINDS = [
  "master_final",
  "delivery",
  "release",
  "promotion",
  "other",
] as const;

export const framingFactsSchema = z.object({
  summary: z
    .string()
    .describe("En une phrase : ce que le texte dit du projet."),
  objective: fact.describe("Résultat recherché par le projet."),
  success_criteria: fact.describe("Critère qui dira que le projet a réussi."),
  main_priority: fact.describe("Ce qui doit primer si un choix se pose."),
  calendar_constraints: fact.describe(
    "Contraintes de calendrier (tournée, indisponibilité, période à éviter).",
  ),
  prerequisites: fact.describe("Ce qui doit être prêt avant de lancer."),
  commitments: fact.describe(
    "Dépenses déjà engagées, signées ou payées, avec le mot qui le dit. Jamais l'enveloppe ou le budget total du projet (budget_quote).",
  ),
  decision_makers: fact.describe("Qui décide, qui valide."),
  missing_skills: fact.describe("Compétences ou ressources qui manquent."),
  current_state: fact.describe("Où en est réellement le projet."),
  existing_elements: fact.describe("Ce qui existe déjà (maquettes, visuels…)."),
  decisions_made: fact.describe("Décisions déjà prises."),
  work_started: fact.describe("Travail déjà commencé."),
  legal_agreements: fact.describe(
    "Contrats ou accords juridiques dont l'existence est dite explicitement (signé, conclu). Pas un arrangement de production (mix calé, studio réservé, ingénieur choisi).",
  ),
  legal_needs: fact.describe("Contrats ou droits qu'il faudra sans doute."),
  legal_secured: fact.describe("Ce qui est déjà sécurisé juridiquement."),
  target_date_quote: z
    .string()
    .nullish()
    .describe(
      "Passage exact où la date cible est donnée, tel qu'écrit. Ne jamais convertir ni compléter.",
    ),
  budget_quote: z
    .string()
    .nullish()
    .describe(
      "Montant de l'enveloppe totale du projet tel qu'écrit (ex. « 15 000 euros »). Pas le plafond d'une seule dépense (un clip à 6 000 euros est une contrainte budget). Ne jamais calculer.",
    ),
  deadlines: z
    .array(z.object({ kind: z.enum(DEADLINE_KINDS), quote }))
    .default([])
    .describe(
      "Échéances imposées réellement mentionnées : master_final, delivery (livraison au distributeur), release (sortie), promotion, other.",
    ),
  needs: z
    .array(
      z.object({ label: z.string(), family: z.enum(NEED_FAMILIES), quote }),
    )
    .default([])
    .describe("Ce qu'il faut produire ou activer (clip, cover, presse…)."),
  constraints: z
    .array(
      z.object({
        text: z.string(),
        type: z.enum([
          "budget",
          "artistic",
          "human",
          "production",
          "rights",
          "other",
        ]),
        quote,
      }),
    )
    .default([])
    .describe(
      "Contraintes réellement mentionnées : budget (financière), artistic (créative), human (humaine), production (opérationnelle), rights (droits, blocage juridique), other.",
    ),
  team: z
    .array(z.object({ name: z.string(), role: z.string().nullish(), quote }))
    .default([])
    .describe("Personnes qui interviennent sur le projet."),
});

export type FramingFacts = z.infer<typeof framingFactsSchema>;
