/**
 * Agenda of a first framing call: the five Brief topics, fixed and coded —
 * no LLM call for a project with no prior data to draw from
 * (docs/CONTEXTE-PROJET.md § 6, usage 5 "Préparation de call").
 */

// `questions`: the precise questions of a topic, when the call was prepared
// « en détail » from the Cadrage (lib/framing/call-prep.ts).
export type AgendaItem = {
  topic: string;
  minutes: number;
  questions?: string[];
};

export const FIRST_CALL_AGENDA: readonly AgendaItem[] = [
  { topic: "Objectif de la sortie", minutes: 10 },
  { topic: "Temporalité : date visée, contraintes de calendrier", minutes: 10 },
  { topic: "Cadre : budget, contraintes, ce qui est déjà décidé", minutes: 10 },
  { topic: "Besoins : ce qu'il faut produire ou organiser", minutes: 15 },
  { topic: "Équipe : qui fait quoi autour du projet", minutes: 10 },
];

export const firstCallAgendaDurationMinutes = FIRST_CALL_AGENDA.reduce(
  (total, item) => total + item.minutes,
  0,
);
