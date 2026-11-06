import { z } from "zod";

/**
 * The artist names hidden in the names of an account shared by link (Labo).
 * A proposal only — the code keeps a name only if it is a piece of one of
 * the account's names, then searches it on Deezer. `reasoning` leads.
 */
export const linkNamesSchema = z.object({
  reasoning: z
    .string()
    .describe(
      "Une ou deux phrases : sous quel nom cette personne sort probablement sa musique, et pourquoi.",
    ),
  searchNames: z
    .array(z.string())
    .describe(
      "Noms d'artiste probables, du plus probable au moins probable, chacun pris tel quel dans un des noms reçus : « theodorabosslady » → « Theodora », « jul.officiel » → « Jul ». Liste vide si aucun.",
    ),
});

export type LinkNames = z.infer<typeof linkNamesSchema>;
