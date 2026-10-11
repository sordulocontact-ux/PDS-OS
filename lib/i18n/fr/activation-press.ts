const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/** Marketing › Activations › Relations presse, in house (ticket « Relations
 * presse », § 5): targets, common template, pitches and follow-ups,
 * opportunities and interviews, coverage. */
export const activationPress = {
  targets: {
    title: "Cibles médias",
    description:
      "Un média du Réseau par cible, son journaliste quand il est connu, la priorité, l'angle et la justification.",
    media: "Média",
    journalist: "Journaliste",
    priority: "Priorité",
    lastMessage: "Dernier message",
    opportunity: "Opportunité",
    coverage: "Retombée",
    none: "—",
  },
  template: {
    title: "Modèle commun",
    description:
      "Validé une fois, puis décliné en un brouillon par cible : accroche et angle de la cible ajoutés par PDS OS, à personnaliser avant validation.",
    subject: (project: string) => `${project} — proposition presse`,
    body: (project: string, artist: string | null) =>
      `Je vous écris au sujet de ${project}${artist ? `, le nouveau projet de ${artist}` : ""}.\n\n[Votre message]\n\nLe dossier de presse est disponible sur demande.\n\nBien à vous,`,
    prepare: "Préparer les brouillons par cible",
    prepareTitle: "Préparer les brouillons par cible",
    prepareBody: (n: number) =>
      `${n} ${plural(n, "brouillon sera créé", "brouillons seront créés")} à partir du modèle validé, pour les cibles qui n'en ont pas. Rien n'est envoyé.`,
    prepared: (n: number) =>
      `${n} ${plural(n, "brouillon préparé", "brouillons préparés")}.`,
    needsValidated: "Validez d'abord le modèle commun.",
    nothingToPrepare: "Chaque cible a déjà son message.",
    greeting: (name: string | null, media: string) =>
      name
        ? `Bonjour ${name.split(" ")[0]},`
        : `Bonjour à l'équipe de ${media},`,
    angleIntro: "L'angle qui pourrait vous intéresser :",
  },
  followUp: {
    subject: (subject: string) => `Relance — ${subject}`,
    body: "Je me permets de revenir vers vous au sujet de mon message précédent.\n\n[Votre relance]\n\nBien à vous,",
  },
  opportunities: {
    title: "Opportunités et interviews",
    description:
      "Proposée ≠ créneau confirmé ≠ réalisée ≠ diffusée. Chaque confirmation dit qui a confirmé quoi, quand, par quel canal.",
    add: "Noter une opportunité",
    addTitle: "Noter une opportunité",
    addDescription:
      "Une réponse positive : interview, article, chronique, passage radio, session…",
    edit: "Mettre à jour",
    editTitle: "Mettre à jour l'opportunité",
    types: {
      interview: "Interview",
      article: "Article",
      review: "Chronique",
      radio: "Passage radio",
      session: "Session",
      info_request: "Demande d'information",
      other: "Autre",
    },
    statuses: {
      proposed: "Proposée",
      availability: "Disponibilité de principe",
      confirmed: "Créneau confirmé",
      done: "Réalisée",
      broadcast_declared: "Diffusion déclarée",
      no_broadcast: "Réalisée, sans diffusion",
      cancelled: "Annulée",
    },
    type: "Type",
    status: "État",
    format: "Format",
    subject: "Sujet",
    scheduledAt: "Date et heure",
    location: "Lieu ou lien",
    participants: "Participants",
    pdsPerson: "Responsable PDS",
    constraints: "Contraintes",
    confirmedBy: "Confirmé par (côté média)",
    confirmationChannel: "Canal de la confirmation",
    confirmationProof: "Preuve de la confirmation (lien)",
    statusNote: "Note",
    saved: "Opportunité enregistrée.",
    slotRequired: "Un créneau confirmé exige une date et une heure.",
    confirmationRequired: "Dites qui a confirmé et par quel canal.",
    brief: "Brief interview",
    briefPrepare: "Préparer le brief",
    briefSave: "Enregistrer le brief",
    briefSaved: "Brief enregistré.",
    briefHint:
      "Repris du cadrage et du dossier validés : messages clés, sujets sensibles, éléments factuels. Les réponses de l'artiste ne sont jamais inventées.",
    none: "Aucune opportunité.",
    confirmedOn: (who: string, channel: string, date: string) =>
      `Confirmé par ${who} (${channel}) le ${date}`,
  },
  briefTemplate: {
    title: (media: string, subject: string | null) =>
      `Brief interview — ${media}${subject ? ` · ${subject}` : ""}`,
    context: "Contexte",
    messages: "Messages clés",
    angles: "Angles",
    facts: "Éléments factuels",
    sensitive: "Sujets sensibles et restrictions",
    questions: "Questions probables (à compléter)",
    practical: "Infos pratiques",
    missing: "Non renseigné dans le cadrage validé",
    noAnswer:
      "Les réponses se préparent avec l'artiste ; aucune n'est écrite ici.",
  },
  coverage: {
    title: "Retombées",
  },
};
