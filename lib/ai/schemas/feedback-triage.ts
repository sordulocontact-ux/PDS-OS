import { z } from "zod";

/**
 * Grouping a new feedback with the open topics. The only decision is `topic`,
 * an id from the list given (checked by code, anything else opens a new
 * topic). Same lesson as the dictation schemas: a leading free-text field
 * (`request`), or ministral-14b answers the schema itself.
 */
export const feedbackTriageSchema = z.object({
  request: z
    .string()
    .describe("En une phrase : de quoi parle le nouveau retour."),
  topic: z
    .string()
    .describe(
      "Identifiant exact du sujet existant qui parle de la même chose, ou chaîne vide.",
    ),
  title: z
    .string()
    .describe("Titre court d'un nouveau sujet ; vide si le sujet existe."),
  summary: z
    .string()
    .describe(
      "Résumé du sujet, qui intègre le nouveau retour (une à trois phrases).",
    ),
});

export type FeedbackTriageOutput = z.infer<typeof feedbackTriageSchema>;
