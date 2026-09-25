import { z } from "zod";

/** Agenda of the next call, built from what the last call left open. */

export const AGENDA_ORIGINS = ["open", "action", "brief_gap"] as const;

export const callPrepSchema = z.object({
  agenda: z
    .array(
      z.object({
        topic: z.string().describe("Sujet à traiter, en quelques mots."),
        question: z
          .string()
          .describe(
            "La question précise à poser pour obtenir une décision ou une information.",
          ),
        origin: z.enum(AGENDA_ORIGINS),
      }),
    )
    .describe("Ordre du jour, du plus bloquant au moins bloquant."),
});

export type CallPrep = z.infer<typeof callPrepSchema>;

/** What the labo sends: the subset of a call report the preparation needs. */
export const callPrepInputSchema = z.object({
  open: z.array(z.object({ what: z.string() })),
  nextActions: z.array(
    z.object({ what: z.string(), who: z.string().nullable() }),
  ),
  brief: z.object({
    objective: z.unknown().nullable(),
    timing: z.unknown().nullable(),
    frame: z.unknown().nullable(),
    needs: z.array(z.unknown()),
    team: z.array(z.unknown()),
  }),
});

export type CallPrepInput = z.infer<typeof callPrepInputSchema>;
