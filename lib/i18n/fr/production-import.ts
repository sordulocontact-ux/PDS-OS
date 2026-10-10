/** Marketing › Production: « Importer une organisation existante ». The
 * names of the brief's topics and of the positions come from
 * productionBrief and productionNeeds. */
export const productionImport = {
  open: "Importer une organisation",
  dialogTitle: "Importer une organisation existante",
  dialogDescription:
    "Collez une note de production, un mail ou un ancien brief. PO propose, vous relisez : rien n'est enregistré avant « Appliquer ».",
  bodyLabel: "Texte de l'organisation",
  bodyPlaceholder:
    "Ex. : tournage en plan-séquence, deux caméras, son en playback ; il faudra un perchman et un guitariste…",
  count: (n: number, max: number) =>
    `${n.toLocaleString("fr-FR")} / ${max.toLocaleString("fr-FR")} caractères`,
  tooLong: (max: number) =>
    `Le texte dépasse ${max.toLocaleString("fr-FR")} caractères : raccourcissez-le.`,
  propose: "Proposer",
  proposing: "PO lit le texte…",
  cancel: "Annuler",
  close: "Fermer",
  review: {
    hint: "Cochez ce que vous gardez. Une rubrique déjà renseignée n'est remplacée que si vous la cochez.",
    brief: "Brief réalisateur",
    needs: "Besoins humains",
    needsHint:
      "Le nombre de personnes est le vôtre : PO n'en propose jamais. Les affectations se font ensuite dans Équipes.",
    keep: (what: string) => `Garder : ${what}`,
    before: "Actuellement",
    after: "Proposé",
    source: "Texte importé",
    quote: (quote: string) => `« ${quote} »`,
    empty:
      "PO n'a rien trouvé dans ce texte qu'il puisse appuyer sur une citation exacte. Vous pouvez compléter le brief et les équipes à la main.",
    back: "Modifier le texte",
    apply: (n: number) =>
      n === 0 ? "Appliquer" : `Appliquer ${n} proposition${n > 1 ? "s" : ""}`,
    applying: "Enregistrement…",
    applied: "Organisation importée : brief et équipes mis à jour.",
  },
  errors: {
    invalid: "Ce texte ne peut pas être lu. Vérifiez sa longueur.",
    notFound: "Cette préparation n'existe plus. Rechargez la page.",
    forbidden:
      "Seul le responsable du projet importe une organisation, pendant la production.",
    provider: "PO n'a pas pu lire le texte. Réessayez dans un instant.",
    nothing: "Cochez au moins une proposition.",
    headcount: (max: number) =>
      `Indiquez un nombre de personnes entre 1 et ${max}.`,
  },
} as const;
