/** A call planned like a Teams meeting, and the Calls page's calendar. */

// "30 min", "1 h", "1 h 30".
const duration = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")}`;
};

export const schedule = {
  fieldTitle: "Nom du call",
  titleMissing: "Donnez un nom au call : c'est ce que les invités liront.",
  fieldDate: "Date",
  dateMissing: "Choisissez le jour du call.",
  fieldStart: "Début",
  startMissing: "Indiquez l'heure de début.",
  fieldEnd: "Fin",
  endMissing: "Indiquez l'heure de fin.",
  endBeforeStart: "La fin doit venir après le début, le même jour.",
  to: "à",
  duration: (minutes: number) => duration(minutes),
  // Participants: members, Réseau contacts, typed addresses.
  fieldParticipants: "Participants",
  participantsHint:
    "Membres de l'équipe, contacts du Réseau ou adresse e-mail de quelqu'un d'extérieur. Vous en faites partie d'office.",
  participantsProjectHint:
    "L'équipe du projet, la direction, un directeur créatif (il rejoint le projet), des contacts du Réseau ou l'adresse e-mail de quelqu'un d'extérieur. Vous en faites partie d'office.",
  searchLabel: "Ajouter un participant",
  searchPlaceholder: "Nom ou adresse e-mail",
  inviteEmail: (email: string) => `Inviter ${email} par e-mail`,
  typeEmail: "Pour inviter quelqu'un d'extérieur, tapez son adresse e-mail",
  emailInvalid:
    "Tapez une adresse e-mail complète (nom@domaine.fr) pour inviter quelqu'un d'extérieur.",
  noResult: (query: string) =>
    `Personne ne s'appelle « ${query} » dans l'équipe ni dans le Réseau.`,
  allPicked: "Tout le monde est déjà invité.",
  noSuggestion: "Tapez un nom pour chercher dans le Réseau.",
  memberDetail: "Équipe PDS",
  projectMemberDetail: "Équipe du projet",
  contactNoEmail: "pas d'e-mail dans le Réseau",
  contactWithoutEmail: (name: string) =>
    `${name} n'a pas d'e-mail dans le Réseau : tapez son adresse pour l'inviter.`,
  externalDetail: "Invité par e-mail",
  remove: (name: string) => `Retirer ${name}`,
  nobody: "Personne d'autre pour l'instant.",
  // Video link.
  meetTitle: "Visio",
  meetGoogle: "Créer un lien Google Meet",
  meetGoogleHint:
    "Le lien est créé à l'enregistrement et Google envoie l'invitation par e-mail à chaque participant.",
  meetOther: "Lien d'une autre visio",
  meetOtherHint: "Zoom, Teams… : collez le lien, « Rejoindre » l'ouvrira.",
  meetUnavailable:
    "La création automatique d'un lien Google Meet n'est pas encore reliée à PDS OS : collez un lien de visio si vous en avez un.",
  linkInvalid: "Le lien de visio doit commencer par https://.",
  pastSlot: "Ce créneau est déjà passé.",
  pastSlotGoogle:
    "Ce créneau est déjà passé : Google n'envoie pas d'invitation pour un call terminé. Choisissez un créneau à venir pour que les invités reçoivent le mail.",
  missingCount: (count: number) =>
    count === 1 ? "Un champ à corriger." : `${count} champs à corriger.`,
  // Sent with the Google Calendar event.
  eventDescription: "Call planifié depuis PDS OS.",
  // On the call's page, after Google refused the link.
  meetFailed:
    "Le call est créé, mais Google n'a pas donné de lien Meet et les invitations ne sont pas parties. Ajoutez un lien de visio ci-dessous et prévenez les invités.",
} as const;

export const calendar = {
  displays: {
    label: "Affichage",
    list: "Liste",
    calendar: "Calendrier",
  },
  // Aujourd'hui, previous / next, Semaine | Mois: lib/i18n/fr/calendar.ts.
  empty: "Aucun call sur cette période.",
  dayEmpty: "Aucun call",
  now: "Maintenant",
  internal: "Réunion interne",
  hint: "Cliquez ou glissez sur une plage libre pour créer une réunion. Glissez un de vos calls pour le déplacer, son bord bas pour le rallonger.",
  hintMonth:
    "Cliquez sur un jour pour y créer une réunion. Glissez un de vos calls vers un autre jour pour le déplacer.",
  // The slot being drawn.
  newSlot: (time: string) => `Nouvelle réunion · ${time}`,
  // Screen readers: one event of the grid.
  eventLabel: (title: string, time: string, where: string) =>
    `${title}, ${time}, ${where}`,
  timeRange: (start: string, end: string) => `${start} – ${end}`,
  more: (count: number) => (count === 1 ? "1 autre" : `${count} autres`),
  createOn: (day: string) => `Nouvelle réunion le ${day}`,
  // The card of a call clicked in the calendar.
  peek: {
    open: "Ouvrir le call",
    reschedule: "Modifier l'horaire",
    close: "Fermer",
  },
  reschedule: {
    title: "Modifier l'horaire",
    description:
      "Le call change de créneau ; s'il a un lien Google Meet, Google prévient les invités.",
    save: "Enregistrer",
    saving: "Enregistrement…",
    cancel: "Annuler",
  },
  moved: "Horaire modifié.",
  googleMoveFailed:
    "Horaire modifié, mais Google n'a pas prévenu les invités : prévenez-les.",
} as const;

/** The details of a call on its page, as Teams shows a meeting. */
export const details = {
  title: "Détails",
  when: "Quand",
  where: "Rattachement",
  organizer: "Organisé par",
  link: "Lien de la visio",
  noLink: "Pas encore de lien de visio.",
  copy: "Copier le lien",
  copied: "Lien copié.",
  copyFailed: "Copie impossible : sélectionnez le lien à la main.",
  participants: (count: number) => `Participants (${count})`,
  nobody: "Personne d'autre n'est invité.",
  member: "Équipe PDS",
  guest: "Invité par e-mail",
  // The call's sheet, shared with people outside the label.
  share: "Partager avec l'extérieur",
  shareHint:
    "La fiche reprend l'horaire, la durée, l'ordre du jour et le lien de la visio. PDS OS n'envoie rien lui-même.",
  shareCopy: "Copier la fiche du call",
  shareCopied: "Fiche du call copiée.",
  shareCopyFailed: "Copie impossible : votre navigateur l'a refusée.",
  shareEmail: "Envoyer par e-mail",
  sheet: {
    agenda: "Ordre du jour",
    agendaItem: (position: number, topic: string, minutes: number) =>
      `${position}. ${topic} (${minutes} min)`,
    estimated: (minutes: number) => `Durée estimée : environ ${minutes} min`,
    link: (url: string) => `Lien de la visio : ${url}`,
    noLink: "Lien de la visio : à venir",
  },
  // The recording, folded until the call's time comes.
  recordTitle: "Enregistrer le call",
  recordLater:
    "À ouvrir au moment du call : PDS OS enregistre l'onglet de la visio et votre micro.",
} as const;
