import { z } from "zod";

/**
 * Reading a TikTok screenshot: who is named on it. A proposal only — the code
 * keeps a name only if it is in `visibleText`, then looks the person up on
 * Deezer. `analysis` leads, or ministral-14b answers the schema itself.
 */
export const captureReadingSchema = z.object({
  analysis: z
    .string()
    .describe(
      "En deux phrases au plus : ce que montre la capture (vidéo, page de profil…) et qui y est nommé.",
    ),
  isTikTok: z.boolean().describe("true si c'est une capture de TikTok."),
  visibleText: z
    .array(z.string())
    .describe(
      "Chaque ligne de texte lisible sur la capture, recopiée telle quelle.",
    ),
  links: z
    .array(z.string())
    .describe(
      "Les liens écrits sur la capture (bio : linktr.ee/…, …lnk.to/…), tels quels, « … » compris s'ils sont coupés.",
    ),
  people: z
    .array(
      z.object({
        names: z
          .array(z.string())
          .describe(
            "Tous les noms de cette personne écrits sur la capture, tels quels : nom affiché, pseudo sans « @ », nom dans la ligne du son.",
          ),
        artistName: z
          .string()
          .describe(
            "Parmi « names », celui qui sert le plus probablement de nom d'artiste.",
          ),
        searchNames: z
          .array(z.string())
          .describe(
            "Noms d'artiste probables cachés dans un pseudo ou un nom écrit, à chercher sur les plateformes : « theodorabossladyy » → « Theodora », « jul.officiel » → « Jul ». Chacun doit être un morceau d'un nom écrit. Liste vide sinon.",
          ),
        tiktokHandle: z
          .string()
          .nullish()
          .describe(
            "Le pseudo TikTok de cette personne (sans « @ »), seulement si c'est le compte qui publie ou dont c'est le profil. null sinon.",
          ),
        instagram: z
          .string()
          .nullish()
          .describe(
            "Son compte Instagram, seulement s'il est écrit sur la capture (bio, légende : « insta : … », « IG … »). null sinon.",
          ),
        activity: z
          .enum(["artist", "beatmaker", "both", "unknown"])
          .nullish()
          .describe(
            "artist : chante ou rappe ; beatmaker : fait des prods (FL Studio, MPC, « type beat », « prod by »… à l'écran) ; both : les deux ; unknown : la capture ne le dit pas.",
          ),
        role: z
          .enum(["account", "sound", "mentioned"])
          .describe(
            "account : le compte qui publie ou dont c'est le profil ; sound : l'artiste du son utilisé ; mentioned : un autre artiste nommé.",
          ),
        reasoning: z
          .string()
          .describe(
            "Une ou deux phrases : pourquoi ces noms désignent la même personne, et pourquoi ce nom d'artiste.",
          ),
      }),
    )
    .describe("Une entrée par personne, jamais deux pour la même personne."),
});

export type CaptureReading = z.infer<typeof captureReadingSchema>;
