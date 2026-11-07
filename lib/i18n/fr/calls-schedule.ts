/** A call planned like a Teams meeting, and the calendar of the Calls and of
 * the Calendrier's week. */

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

/** A call's page: its video link, participants and sheet (call-side,
 * call-sheet-menu, lib/calls/sheet.ts). */
export const details = {
  noLink: "Pas encore de lien de visio.",
  copy: "Copier le lien",
  copied: "Lien copié.",
  copyFailed: "Copie impossible : sélectionnez le lien à la main.",
  nobody: "Personne d'autre n'est invité.",
  member: "Équipe PDS",
  guest: "Invité par e-mail",
  // The call's sheet, shared with people outside the label (« ⋯ »).
  shareCopy: "Copier la fiche du call",
  shareCopied: "Fiche du call copiée.",
  shareCopyFailed: "Copie impossible : votre navigateur l'a refusée.",
  sheet: {
    agenda: "Ordre du jour",
    agendaItem: (position: number, topic: string, minutes: number) =>
      `${position}. ${topic} (${minutes} min)`,
    estimated: (minutes: number) => `Durée estimée : environ ${minutes} min`,
    link: (url: string) => `Lien de la visio : ${url}`,
    noLink: "Lien de la visio : à venir",
  },
  // « Modifier les participants » of the Participants card (whoever works
  // on the call).
  participants: {
    edit: "Modifier les participants",
    title: "Participants",
    description:
      "Ajoutez ou retirez des participants. Un membre ajouté est prévenu dans PDS OS ; si le call a un lien Google Meet, Google envoie l'invitation par e-mail aux nouveaux invités et prévient ceux que vous retirez.",
    save: "Enregistrer",
    saving: "Enregistrement…",
    close: "Fermer",
    done: "Participants enregistrés.",
    googleFailed:
      "Participants enregistrés, mais Google Agenda n'a pas été mis à jour : prévenez les nouveaux invités.",
  },
  // The recording of a call to come another day, folded.
  recordTitle: "Enregistrer le call",
  recordLater:
    "À ouvrir au moment du call : PDS OS enregistre l'onglet de la visio et votre micro.",
} as const;
