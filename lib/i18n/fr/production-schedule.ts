// The shoot's date and hours as a decision (proto « Projet complet »
// schedModal, production.md § 2.11).
export const productionSchedule = {
  open: "Fixer la date et les horaires",
  change: "Changer la date et les horaires",
  today: (text: string, by: string) =>
    `Aujourd'hui : ${text}, décidé par ${by}. La nouvelle décision le remplace ; l'ancienne reste dans l'historique.`,
  description:
    "La date et les horaires du tournage, décidés et datés : une nouvelle décision remplace l'ancienne.",
  date: "Date du tournage",
  start: "Début",
  end: "Fin",
  source: "Décidé lors de",
  sources: {
    meeting: "Réunion",
    call: "Appel",
    whatsapp: "WhatsApp",
    email: "E-mail",
    other: "Autre",
  },
  submit: "Valider la date et les horaires",
  decided: "Date et horaires validés",
  changed: "Date et horaires changés",
  // « Tournage le Ven. 23/10/2026, de 8 h à 15 h ».
  text: (day: string, start: string, end: string) =>
    `Tournage le ${day}, de ${start} à ${end}`,
  decidedBy: (who: string) => ` · décidé par ${who}`,
  none: (who: string) => `Aucune décision validée · à fixer par ${who}`,
  history: "Décisions sur la date",
  historyLine: (text: string, by: string, at: string) =>
    `${at} · ${by} : ${text}`,
  replaced: (at: string) => `remplacée le ${at}`,
  rework:
    "La date a changé depuis la confirmation : la préparation est à confirmer de nouveau.",
  errors: {
    date: "Choisissez la date du tournage.",
    start: "L'heure de début.",
    end: "L'heure de fin.",
    end_before_start: "La fin doit être après le début.",
    same_schedule: "C'est déjà la date et les horaires décidés.",
    schedule_required: "Choisissez la date du tournage.",
  },
} as const;
