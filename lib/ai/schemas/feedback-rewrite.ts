import { z } from "zod";

/**
 * Rewriting a feedback topic: a proposal only, shown in the director's edit
 * form, saved by the director. Same lesson as the other schemas: a leading
 * free-text field (`request`), or ministral-14b answers the schema itself.
 */
export const feedbackRewriteSchema = z.object({
  request: z
    .string()
    .describe(
      "En une phrase : ce que le directeur demande, ou « aucune demande ».",
    ),
  title: z.string().describe("Titre court du sujet (moins de dix mots)."),
  summary: z.string().describe("Résumé du sujet, une à quatre phrases."),
});

export type FeedbackRewriteOutput = z.infer<typeof feedbackRewriteSchema>;
