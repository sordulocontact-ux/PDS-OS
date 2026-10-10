import { z } from "zod";

/**
 * What PO reads in an organisation written elsewhere (a production note, a
 * mail, an old brief), for one deliverable's production: values for the
 * director's brief and human needs, each with the verbatim passage it comes
 * from. Never a count of people, never a name: the code keeps only what it
 * can verify (lib/production/import-verify.ts).
 */

const quote = z
  .string()
  .describe(
    "Passage recopié mot pour mot du texte importé qui justifie la proposition (au moins trois mots). Recopier exactement, sans reformuler.",
  );

// Closed choices arrive as plain strings, checked by code against the lists:
// an unknown value drops one proposal instead of failing the whole answer.
const choice = (what: string, values: string) =>
  z
    .object({
      value: z.string().describe(`Une seule valeur parmi : ${values}.`),
      quote,
    })
    .nullish()
    .describe(`${what} Null si le texte ne le dit pas clairement.`);

const text = (what: string) =>
  z
    .object({
      value: z
        .string()
        .describe(
          "Une à trois phrases courtes, fidèles au texte, sans rien ajouter.",
        ),
      quote,
    })
    .nullish()
    .describe(`${what} Null si le texte n'en dit rien.`);

// Same lessons as the other schemas (docs/ARCHITECTURE.md § 12): a leading
// free-text field (`request`), a flat shape, `.nullish()` for what the model
// may leave out and `.default([])` for the list.
export const productionImportSchema = z.object({
  request: z
    .string()
    .describe(
      "En une phrase : ce que le texte dit de l'organisation du tournage.",
    ),
  coverage: choice(
    "Découpage : plan-séquence, découpage en plans ou mixte.",
    "one_take (plan-séquence), cut (découpage), mixed (mixte)",
  ),
  cameraSetup: choice(
    "Dispositif caméra : une caméra ou plusieurs.",
    "single (une caméra), multi (plusieurs caméras)",
  ),
  soundCapture: choice(
    "Son : playback, captation live ou mixte.",
    "playback, live (captation live), mixed (mixte)",
  ),
  stagingIntent: text("Intention de mise en scène."),
  coverageNote: text("Précisions sur le découpage."),
  cameraNote: text("Précisions sur le dispositif caméra."),
  soundNote: text("Précisions sur le son."),
  runOfShow: text("Déroulé du tournage."),
  constraintsNote: text("Contraintes (lieu, accès, horaires, matériel…)."),
  referencesNote: text("Références citées pour le tournage."),
  openNeeds: text("Besoins encore à confirmer."),
  needs: z
    .array(
      z.object({
        family: z
          .string()
          .describe(
            "Famille : direction, camera, sound, performers ou production.",
          ),
        role: z
          .string()
          .describe("Poste, recopié depuis la liste de la famille, ou other."),
        label: z
          .string()
          .nullish()
          .describe(
            "Intitulé du poste en quelques mots, seulement si role vaut other.",
          ),
        speciality: z
          .string()
          .nullish()
          .describe(
            "Pour la famille performers seulement : l'instrument ou la partie (Guitare, Chœurs…).",
          ),
        quote,
      }),
    )
    .default([])
    .describe(
      "Postes nécessaires au tournage que le texte mentionne. Jamais de nombre de personnes ni de nom.",
    ),
});

export type ProductionImportOutput = z.infer<typeof productionImportSchema>;
