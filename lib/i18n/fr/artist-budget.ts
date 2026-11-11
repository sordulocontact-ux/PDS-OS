/** The Budget of an artist (BUD 2): its envelope by poste, its spends. */
export const artistBudget = {
  tab: "Budget",
  loadError: "Impossible de charger le budget de l'artiste. Rechargez la page.",
  envelope: {
    title: "Enveloppe",
    period: (from: string, to: string | null) =>
      to ? `Du ${from} au ${to}` : `Depuis le ${from}`,
    open: "Ouvrir l'enveloppe",
    reopen: "Nouvelle enveloppe",
    edit: "Modifier",
    emptyTitle: "Pas encore d'enveloppe",
    emptyBody:
      "La direction fixe le budget de l'artiste et le répartit par poste. Les dépenses de l'artiste et de ses projets s'y comptent ensuite d'elles-mêmes.",
    emptyBodyReader:
      "La direction n'a pas encore fixé le budget de cet artiste. Ses dépenses sont listées dessous.",
  },
  tiles: {
    amount: "Enveloppe",
    spent: "Dépensé",
    rest: "Reste",
    unallocated: "Non réparti",
    spentHint: (direct: string, projects: string) =>
      `${direct} en direct, ${projects} par ses projets`,
    pendingHint: (amount: string) => `${amount} encore estimés`,
    overrun: (amount: string) => `Dépassement de ${amount}`,
    unallocatedHint: "La part de l'enveloppe donnée à aucun poste.",
  },
  posts: {
    title: "Par poste",
    label: "Postes de l'enveloppe",
    poste: "Poste",
    planned: "Prévu",
    spent: "Dépensé",
    rest: "Reste",
    none: "Sans poste",
    notAllotted: "Non prévu",
    over: (amount: string) => `Dépassé de ${amount}`,
    pending: (amount: string) => `dont ${amount} encore estimés`,
  },
  lines: {
    title: "Dépenses",
  },
  history: {
    title: "Historique",
    closedLabel: (period: string, amount: string, spent: string) =>
      `${period} · ${amount} · ${spent} dépensés`,
    events: {
      opened: (who: string, amount: string) =>
        `${who} a ouvert l'enveloppe (${amount}).`,
      changed: (who: string, before: string | null, amount: string) =>
        before && before !== amount
          ? `${who} a modifié l'enveloppe (${before} → ${amount}).`
          : `${who} a modifié la répartition de l'enveloppe.`,
      closed: (who: string) =>
        `${who} a clos l'enveloppe en ouvrant la suivante.`,
    },
    someone: "Quelqu'un",
    empty: "Aucun changement pour l'instant.",
  },
  form: {
    newTitle: "Ouvrir l'enveloppe",
    reopenTitle: "Nouvelle enveloppe",
    editTitle: "Modifier l'enveloppe",
    description:
      "Un montant, une période et sa répartition par poste. Ce qui n'est donné à aucun poste reste « non réparti ».",
    reopenDescription:
      "L'enveloppe en cours sera close la veille du premier jour et gardée dans l'historique.",
    amount: "Montant de l'enveloppe HT (€)",
    amountMissing: "Indiquez le montant, par exemple 60000.",
    startsOn: "Premier jour",
    startsOnMissing: "Indiquez le premier jour de l'enveloppe.",
    endsOn: "Dernier jour",
    endsOnBefore: "Le dernier jour vient après le premier.",
    postsTitle: "Répartition par poste",
    addPost: "Ajouter un poste",
    choosePost: "Choisir un poste",
    postAmount: (poste: string) => `Montant pour ${poste} (€)`,
    removePost: (poste: string) => `Retirer ${poste}`,
    postInvalid: "Indiquez un montant en euros.",
    allotted: (allotted: string, amount: string, rest: string) =>
      `Réparti : ${allotted} sur ${amount} · non réparti : ${rest}`,
    overTotal: (over: string) =>
      `Les postes dépassent l'enveloppe de ${over} : baissez un poste ou augmentez le montant.`,
    missingCount: (n: number) =>
      n > 1 ? `${n} champs à compléter.` : "Un champ à compléter.",
    save: "Enregistrer",
    saving: "Enregistrement…",
  },
  errors: {
    invalid: "Vérifiez le montant, les dates et les postes de l'enveloppe.",
    forbidden: "Seule la direction ouvre et modifie l'enveloppe d'un artiste.",
    postsOverTotal:
      "Les postes ne peuvent pas dépasser le montant de l'enveloppe.",
    startsBeforePrevious:
      "La nouvelle enveloppe commence après le premier jour de la précédente.",
    closed: "Cette enveloppe est close : ouvrez-en une nouvelle.",
    generic: "L'enveloppe n'a pas pu être enregistrée. Réessayez.",
  },
  done: {
    opened: "Enveloppe ouverte.",
    changed: "Enveloppe modifiée.",
  },
  // On a project's Budget: the part of its artist's envelope it takes.
  share: {
    label: (artist: string) => `Enveloppe de ${artist}`,
    body: (project: string, total: string, amount: string) =>
      `Ce projet : ${project} · l'artiste : ${total} sur ${amount}`,
    rest: (amount: string) => `Reste ${amount}`,
    overrun: (amount: string) => `Dépassement de ${amount}`,
    open: "Voir le budget de l'artiste",
  },
} as const;
