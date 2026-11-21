// « Participations et contrats » of a collective's Juridique (lot 11 of
// docs/pds-mic-plan.md): each artist on each title, the contract of the
// participation and its deal (Business module), read under their rights.
// « de » elides before a vowel: « Ouvrir le deal d'Iris Moon ».
const de = (name: string) =>
  /^[aeiouyàâéèêëîïôûüh]/i.test(name) ? `d'${name}` : `de ${name}`;

export const legalParticipations = {
  title: "Participations et contrats",
  link: "Participations et contrats",
  facts: {
    signed: "Contrats signés",
    signedValue: (signed: number, confirmed: number) =>
      `${signed} sur ${confirmed} participation${confirmed > 1 ? "s" : ""} confirmée${confirmed > 1 ? "s" : ""}`,
    withoutDeal: "Sans dossier de négociation",
    followUps: "Relances dues",
  },
  columns: {
    artist: "Artiste",
    status: "Participation",
    contract: "Contrat",
    negotiation: "Négociation",
    nextAction: "Prochaine action",
    title: "Titre",
    actions: "Actions",
  },
  // Under 1280 px, the hidden columns under the name.
  caption: {
    contract: "Contrat",
    negotiation: "Négociation",
    nextAction: "Prochaine action",
  },
  titleStatus: {
    planned: "Prévu",
    abandoned: "Abandonné",
  },
  noParticipation: "Aucun artiste invité sur ce titre.",
  empty: {
    title: "Aucun artiste invité pour l'instant",
    body: "Invitez des artistes sur les titres depuis Titres et artistes.",
    link: "Ouvrir Titres et artistes",
  },
  contract: {
    missing: "Manquant",
    hidden: "Lié",
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
