import { z } from "zod";

/**
 * A synthesis of the team's comments on a version of the mix, proposed by
 * PO for the project's owner, who edits it before sending it to the
 * engineer (ticket Master § 10). Text only: no score, no decision.
 */
export const mixFeedbackSchema = z.object({
  summary: z
    .string()
    .describe(
      "La synthèse des retours, une ligne par point à corriger, chaque ligne commençant par « - ». Les doublons regroupés, les contradictions signalées.",
    ),
});

export type MixFeedback = z.infer<typeof mixFeedbackSchema>;
