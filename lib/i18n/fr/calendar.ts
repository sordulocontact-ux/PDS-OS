/** The Calendrier of the main navigation, and its bar: the period, today,
 * previous and next. */
export const calendar = {
  // components/ui/calendar-toolbar.tsx
  period: {
    modes: {
      label: "Période",
      week: "Semaine",
      month: "Mois",
    },
    today: "Aujourd'hui",
    previous: {
      week: "Semaine précédente",
      month: "Mois précédent",
    },
    next: {
      week: "Semaine suivante",
      month: "Mois suivant",
    },
  },

  // app/(app)/app/calendar: the dates PDS OS already knows, every project.
  page: {
    title: "Calendrier",
    description:
      "Les dates de tous vos projets : sorties, master, tournages, temps forts, calls et échéances. Chacune s'ouvre là où elle se décide.",
    loadError:
      "Une partie du calendrier n'a pas pu être lue. Rechargez la page.",
    views: {
      label: "Afficher",
      all: "Tout",
      mine: "À vous",
    },
    empty: {
      all: "Aucune date sur cette période.",
      mine: "Rien ne vous attend sur cette période.",
    },
    more: (count: number) => (count === 1 ? "1 autre" : `${count} autres`),
    dayEmpty: "Aucune date",
    // Screen readers: the day of a cell, then each item.
    mine: "À vous",
    overdue: "En retard",
  },

  // What each date is, said the way the app says it (VISION-UX rule 4: the
  // label says what the date means).
  kinds: {
    release: "Sortie",
    projectDue: "Échéance du projet",
    mixV1: "Mix V1 attendu",
    mixFinal: "Mix final attendu",
    mastering: "Mastering attendu",
    masterFinal: "Master final attendu",
    shoot: (deliverable: string) => `Tournage · ${deliverable}`,
  },
  // « Lina Haddad : valider le Mix V1 », on someone else's action.
  someone: (who: string, todo: string) => `${who} : ${todo}`,
} as const;
