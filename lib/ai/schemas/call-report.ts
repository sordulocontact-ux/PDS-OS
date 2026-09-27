import { z } from "zod";

/**
 * Structured report extracted from a call transcript (labo draft, to be
 * validated with the client before step 2).
 *
 * Every item carries `quote`: a verbatim excerpt of the transcript. Code then
 * locates it in the timed segments — the model never produces a timestamp,
 * a date or a status (CLAUDE.md, rule 6).
 */

const quote = z
  .string()
  .describe(
    "Extrait mot pour mot de la transcription qui justifie l'élément. Recopier exactement, sans reformuler.",
  );

const who = z
  .string()
  .nullable()
  .describe(
    "Personne nommée dans la transcription, ou null si personne n'est désigné.",
  );

export const NEED_FAMILIES = [
  "creation_content",
  "promotion_distribution",
  "experiences_activations",
  "other",
] as const;

export type NeedFamily = (typeof NEED_FAMILIES)[number];

const field = z
  .object({
    value: z.string().describe("Ce qui a été dit, reformulé en une phrase."),
    quote,
  })
  .nullable();

export const callReportSchema = z.object({
  summary: z
    .string()
    .describe("Résumé factuel du call en deux ou trois phrases."),
  decided: z
    .array(
      z.object({ what: z.string(), who, why: z.string().nullable(), quote }),
    )
    .describe("Décisions explicitement prises pendant le call."),
  open: z
    .array(z.object({ what: z.string(), why: z.string().nullable(), quote }))
    .describe(
      "Questions restées sans décision. Pas de responsable, pas d'échéance.",
    ),
  nextActions: z
    .array(
      z.object({ what: z.string(), who, why: z.string().nullable(), quote }),
    )
    .describe("Actions à mener, telles qu'annoncées pendant le call."),
  brief: z.object({
    objective: field.describe("Objectif de la sortie."),
    timing: field.describe(
      "Temporalité telle qu'énoncée (ex. « début mars »). Ne jamais convertir en date.",
    ),
    needs: z.array(
      z.object({
        label: z.string(),
        family: z.enum(NEED_FAMILIES),
        quote,
      }),
    ),
    frame: z
      .array(z.object({ value: z.string(), quote }))
      .describe(
        "Contraintes réellement mentionnées (budget, production, artistique, droits…), une entrée par contrainte distincte. Liste vide si aucune.",
      ),
    team: z.array(
      z.object({ name: z.string(), role: z.string().nullable(), quote }),
    ),
  }),
  strategy: z.object({
    positioning: field.describe(
      "Positionnement de la sortie, tel qu'il a été formulé.",
    ),
    audiences: field.describe("Publics visés, tels qu'ils ont été nommés."),
    narrative: field.describe(
      "Narratif, histoire racontée autour de la sortie.",
    ),
    levers: z
      .array(
        z.object({
          label: z.string(),
          family: z.enum(NEED_FAMILIES),
          quote,
        }),
      )
      .describe(
        "Leviers du dispositif de lancement évoqués (clip, playlisting, live, relations presse…).",
      ),
  }),
});

export type CallReport = z.infer<typeof callReportSchema>;
