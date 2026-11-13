/**
 * Daily quota of requests to PO (the language model): the refusal shown
 * wherever PO is called, the settings page, the team screen.
 */
const perDay = (limit: number) =>
  limit === 1 ? "1 requête par jour" : `${limit} requêtes par jour`;

export const aiUsage = {
  // Every place a call to PO is refused because the day's limit is reached.
  exceeded: (limit: number) =>
    `Limite du jour atteinte : ${limit === 1 ? "votre requête" : `vos ${limit} requêtes`} à PO ${limit === 1 ? "est utilisée" : "sont utilisées"}. Le compteur repart à zéro à minuit ; le directeur général peut augmenter votre limite dans Équipe.`,

  settings: {
    title: "Paramètres",
    description: "Votre utilisation de PO et vos connexions",
    navLink: "Paramètres",
    usage: {
      title: "Utilisation de PO",
      description:
        "Chaque appel à PO compte pour une requête : un message, une analyse, la lecture d'un document ou d'une image.",
      today: "Requêtes du jour",
      barLabel: (used: number, limit: number) =>
        `${used} requêtes utilisées sur ${limit}`,
      percent: (percent: number) => `${percent} % utilisé`,
      count: (used: number, limit: number) => `${used} sur ${limit}`,
      resets: "Le compteur repart à zéro à minuit (heure de Paris).",
      limit: (limit: number) => `Votre limite : ${perDay(limit)}.`,
      askDirector:
        "Elle est fixée par le directeur général : demandez-lui de l'augmenter s'il vous en faut plus.",
      ownLimit: "Vous la changez, comme celle de l'équipe, dans",
      teamLink: "Équipe",
      reached:
        "Limite du jour atteinte : PO ne répondra plus avant minuit. Le directeur général peut l'augmenter dans Équipe.",
      nearlyReached: (left: number) =>
        left === 1
          ? "Il vous reste 1 requête aujourd'hui."
          : `Il vous reste ${left} requêtes aujourd'hui.`,
      loadError: "Lecture de votre utilisation impossible pour l'instant.",
    },
  },

  team: {
    column: "PO aujourd'hui",
    count: (used: number, limit: number) => `${used} / ${limit}`,
    barLabel: (used: number, limit: number) =>
      `${used} requêtes à PO utilisées aujourd'hui sur ${limit}`,
    field: "Requêtes à PO par jour",
    hint: (used: number) =>
      `${used} utilisée${used > 1 ? "s" : ""} aujourd'hui. 200 par défaut ; le compteur repart à zéro à minuit.`,
    invalid: "Indiquez un nombre entier entre 0 et 10 000.",
  },
};
