import { z } from "zod";

import { CONTRACT_TYPES } from "@/lib/contracts/types";
import { FORM_ROLES } from "@/lib/legal/forms/definition";

/**
 * The values PO points at in a contract that is already filled in, to turn
 * it into a template. The model only points: the code keeps an excerpt
 * when it is written as is in the text, and the person replaces each one
 * (or not). Contact details and numbers are found by the code, not here.
 * With them, what the template itself is: a name, its type, the roles it
 * is for and when to use it, pre-filled in the form and corrected there.
 */
export const PO_TEMPLATE_FIELDS = [
  "personne.nom_civil",
  "personne.nom_artiste",
  "personne.adresse",
  "personne.societe",
  "projet.titre",
  "projet.artiste",
  "projet.titres",
  "remuneration",
  "organisation.nom",
] as const;

export const templateValuesSchema = z.object({
  template: z
    .object({
      name: z
        .string()
        .describe(
          "Nom court du modèle, sans le nom de la personne ni du projet : « Contrat de licence d'un titre », « Prestation de mixage ».",
        ),
      type: z
        .enum(CONTRACT_TYPES)
        .describe(
          "artist : contrat d'artiste (enregistrement exclusif) ; license : licence d'un enregistrement ; distribution ; publishing : édition ou cession de droits d'auteur ; coproduction ; image_rights : droit à l'image ; service : prestation (mix, mastering, studio, réalisation…) ; partnership : partenariat ; other : autre.",
        ),
      roles: z
        .array(z.enum(FORM_ROLES))
        .max(5)
        .describe(
          "Le ou les rôles de la personne qui signe avec le label : author (paroles), composer, arranger, performer (artiste interprète), musician, backing_vocalist (choriste), producer, label, provider (prestataire : mix, mastering, studio), publisher (éditeur), other.",
        ),
      usage: z
        .string()
        .describe(
          "Une phrase : quand utiliser ce modèle, sans nom propre. « Pour un musicien de session payé au cachet sur un enregistrement. »",
        ),
    })
    .nullable()
    .default(null),
  values: z
    .array(
      z.object({
        excerpt: z
          .string()
          .describe(
            "La valeur recopiée mot pour mot, sur une seule ligne, sans rien autour.",
          ),
        field: z
          .enum(PO_TEMPLATE_FIELDS)
          .describe(
            "personne.nom_civil : prénom et nom du cocontractant ; personne.nom_artiste : son nom de scène ; personne.adresse : son adresse postale ; personne.societe : la raison sociale de sa société ; projet.titre : le titre du projet ou de l'album ; projet.artiste : l'artiste principal du projet ; projet.titres : le ou les titres (morceaux) concernés ; remuneration : la somme qui lui est versée ; organisation.nom : le nom du label ou de la structure qui signe avec lui.",
          ),
      }),
    )
    .max(40)
    .default([]),
});
