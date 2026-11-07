/**
 * Facts of PO's read functions budget, calendar, files and notifications
 * (lib/assistant/read/): sentences worded by code, never by the model.
 */
export const assistantReadPilot = {
  budget: {
    hidden:
      "Le budget d'un projet se lit seulement par son responsable et la direction : PO ne peut pas le donner à cette personne.",
    notLaunched: (title: string) =>
      `Le projet « ${title} » n'est pas encore lancé : il n'a pas de budget.`,
    envelope: (amount: string) => `Enveloppe du projet : ${amount}.`,
    noEnvelope: "Le projet n'a pas d'enveloppe définie.",
    noLines: "Le budget ne contient encore aucune ligne.",
    total: (label: string, amount: string) => `${label} : ${amount}.`,
    committedNote:
      "Le total « Engagé » compte aussi ce qui est facturé ou payé ; « Proposé » (un devis non accepté) ne consomme pas l'enveloppe.",
    rest: (amount: string) =>
      `Reste sur l'enveloppe après l'engagé : ${amount}.`,
    overrun: (amount: string) =>
      `Dépassement de l'enveloppe : ${amount} au-delà de ce qui est engagé.`,
    line: (label: string, amount: string, status: string, family: string) =>
      `Ligne « ${label} » : ${amount}, ${status}${family ? `, ${family}` : ""}.`,
  },
  calendar: {
    periods: {
      this_week: "cette semaine",
      next_week: "la semaine prochaine",
      this_month: "ce mois-ci",
      next_month: "le mois prochain",
    },
    covers: (from: string, to: string) => `Période lue : du ${from} au ${to}.`,
    coversWeek: (from: string, to: string) =>
      `Période lue : semaine du ${from} au ${to}.`,
    coversMonth: (month: string) => `Période lue : ${month}.`,
    mineOnly: "Seules les dates qui vous demandent un geste sont listées.",
    empty: "Aucune date au Calendrier sur cette période.",
    kinds: {
      release: "sortie",
      master: "Mix et Master",
      shoot: "tournage",
      milestone: "temps fort",
      call: "call",
      session: "session studio",
      step: "étape",
      task: "tâche",
    },
    item: (
      day: string,
      time: string | null,
      label: string,
      kind: string,
      project: string | null,
      flags: string,
    ) =>
      `${day}${time ? ` à ${time}` : ""} : ${label} (${kind}${project ? `, projet ${project}` : ""})${flags}.`,
    overdue: " — en retard",
    mine: " — à vous",
    noMatch: (query: string) =>
      `Aucune date du Calendrier sur cette période ne correspond à « ${query} ».`,
    error:
      "Une partie du Calendrier n'a pas pu être lue : la liste peut être incomplète.",
  },
  files: {
    empty: "Aucun fichier visible ne correspond.",
    count: (shown: number, total: number) =>
      total === 1
        ? "1 fichier correspond."
        : `${total} fichiers correspondent${shown < total ? ` (${shown} listés)` : ""}.`,
    line: (
      name: string,
      category: string,
      owner: string,
      version: number,
      versions: number,
      day: string,
    ) =>
      `${name} : ${category}, rattaché à ${owner}, version ${version}${versions > 1 ? ` sur ${versions}` : ""}, ajouté le ${day}.`,
    sources: {
      artist: "l'artiste",
      master: "le titre",
      project: "le projet",
      contract: "le contrat",
    },
    truncated:
      "La bibliothèque est coupée à ses 500 fichiers les plus récents : un fichier plus ancien peut manquer.",
  },
  notifications: {
    empty: "Aucune notification sur cette période.",
    unread: (count: number) =>
      count === 0
        ? "Aucune notification non lue."
        : count === 1
          ? "1 notification non lue."
          : `${count} notifications non lues.`,
    line: (day: string, time: string, text: string, unread: boolean) =>
      `${day} à ${time} : ${text}${unread ? " (non lue)" : ""}.`,
    since: {
      today: "aujourd'hui",
      yesterday: "depuis hier",
      this_week: "depuis lundi",
      all: "les plus récentes",
    },
    window: (label: string) => `Notifications lues : ${label}.`,
    partial: "Seules les 50 dernières notifications sont lues.",
  },
};
