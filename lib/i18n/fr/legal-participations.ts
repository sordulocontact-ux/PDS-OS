// « Participations et contrats » of a collective's Juridique (lot 11 of
// docs/pds-mic-plan.md): each artist on each title, the contract of the
// participation and its deal (Business module), read under their rights.
// « de » elides before a vowel: « Ouvrir le deal d'Iris Moon ».
const de = (name: string) =>
  /^[aeiouyàâéèêëîïôûüh]/i.test(name) ? `d'${name}` : `de ${name}`;

export const legalParticipations = {
  title: "Participations et contrats",
  link: "Participations et contrats",
  columns: {
    artist: "Artiste",
    status: "Participation",
    contract: "Contrat",
    negotiation: "Négociation",
    nextAction: "Prochaine action",
    title: "Titre",
    actions: "Actions",
  },
  titleStatus: {
    planned: "Prévu",
    abandoned: "Abandonné",
  },
  noParticipation: "Aucun artiste invité sur ce titre.",
  empty: {
    title: "Aucun artiste invité pour l'instant",
    body: "Invitez des artistes sur les titres depuis « Titres ».",
  },
  negotiation: {
    none: "Pas de dossier de négociation",
    by: (name: string) => `par ${name}`,
    unassigned: "À affecter",
    link: (artist: string, stage: string) =>
      `Ouvrir le deal ${de(artist)}, étape ${stage}`,
  },
  open: {
    button: "Ouvrir un dossier",
    again: "Ouvrir un nouveau dossier",
    label: (artist: string, title: string) =>
      `Ouvrir un dossier de négociation pour ${artist} sur ${title}`,
    title: (artist: string, title: string) =>
      `Ouvrir le dossier de négociation ${de(artist)} · ${title}`,
    negotiator: "Négocié par",
    negotiatorNone: "À affecter plus tard",
    submit: "Ouvrir le dossier",
    done: "Dossier de négociation ouvert.",
  },
} as const;
