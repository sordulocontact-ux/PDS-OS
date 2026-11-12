/**
 * explain_access and app_guide (docs/ASSISTANT.md § 3 quater): who may do
 * what, worded by code from the viewer's access, role_permissions and the
 * open page. Model context, also shown under PO's answer.
 */
export const assistantAccess = {
  position: (position: string) => `Vous êtes ${position.toLowerCase()}.`,
  noPosition: "Votre compte n'a pas encore de poste dans l'équipe.",
  allows: (list: string) => `Votre poste permet de : ${list}.`,
  // One phrase per permission (lib/auth/redirects.ts PERMISSIONS).
  permissions: {
    administer: "gérer l'équipe et les accès",
    assign_projects: "transmettre un projet à un chef de projet",
    validate:
      "valider ce qu'on soumet (Brief, étapes, contrats, modèles de contrat, accords de principe des deals)",
    pilot_projects: "mener les projets dont on est responsable",
    creative_work:
      "valider les maquettes et déposer des fichiers dans les projets",
    manage_catalog: "créer et modifier les artistes et les titres",
    create_projects: "créer des projets et les modifier avant leur lancement",
    view_all_projects: "voir tous les projets et leurs contrats",
    archive_records: "archiver et supprimer",
    read_feedback: "lire et traiter les retours de toute l'équipe",
    manage_network: "ajouter et modifier les contacts du Réseau",
    manage_contracts: "créer et suivre des contrats",
    manage_legal:
      "voir et mener le Juridique des projets, gérer les modèles de contrat",
    manage_sessions: "créer et mener les sessions studio",
    negotiate: "négocier les deals qui vous sont confiés (page Deals)",
    read_artist_budgets:
      "lire le budget des artistes et saisir leurs dépenses directes",
    manage_artist_budgets:
      "ouvrir et modifier l'enveloppe budgétaire d'un artiste",
    open_deals: "ouvrir un deal sur un artiste, qui vous est confié",
  } as Record<string, string>,
  // A permission the page needs: granted, or who holds it.
  youCan: (what: string) => `Votre poste vous permet de ${what}.`,
  youCannot: (what: string, holders: string) =>
    `Votre poste ne permet pas de ${what}. Le peuvent : ${holders}.`,
  nobodyHolds: "personne dans l'équipe pour l'instant",
  holder: (name: string, position: string) =>
    `${name} (${position.toLowerCase()})`,
  // app_guide: who may act, from role_permissions.
  guideWho: (what: string, positions: string, yours: boolean) =>
    `Pour ${what} : ${positions}.${yours ? " Votre poste le permet." : " Votre poste ne le permet pas."}`,

  // The open page.
  noPage:
    "PO n'a pas été ouvert depuis une page précise : seuls les droits de votre poste sont connus.",
  project: {
    hidden:
      "Ce projet n'est pas visible pour vous, ou il n'existe plus. Un projet se voit par son responsable, la personne à qui il est transmis, sa direction artistique, les ingénieurs internes de son Master, son équipe de production et la direction.",
    owner: (title: string) =>
      `Vous êtes responsable du projet « ${title} » : vous pouvez y écrire.`,
    launchedOther: (title: string, owner: string | null) =>
      `Le projet « ${title} » est lancé : seul son responsable${owner ? `, ${owner},` : ""} y écrit (Cadrage, calls, étapes, tâches, budget).`,
    directorReads:
      "Votre poste vous permet de le lire et de valider ce qu'on vous soumet, pas d'écrire à la place du responsable.",
    readOnly: "Vous pouvez le lire, pas le modifier.",
    notLaunched: (title: string, status: string) =>
      `Le projet « ${title} » n'est pas encore lancé (${status.toLowerCase()}) : ses étapes n'existent qu'après l'acceptation du chef de projet.`,
    editBeforeLaunch: "modifier un projet avant son lancement",
    toAnswer:
      "Il vous a été transmis : acceptez-le, refusez-le ou demandez une précision depuis sa page.",
    waitingOn: (name: string) => `Il attend la réponse de ${name}.`,
    legal: "voir et mener le Juridique d'un projet",
    budgetHidden:
      "Le budget d'un projet se lit seulement par son responsable et la direction.",
  },
  step: {
    done: (place: string) =>
      `L'étape « ${place} » est faite : une étape validée est définitive.`,
    locked: (place: string) =>
      `L'étape « ${place} » est verrouillée : ses prérequis ne sont pas tous faits.`,
    upcoming: (place: string) =>
      `L'étape « ${place} » n'est pas encore ouverte.`,
  },
  contract: {
    hidden: "Ce contrat n'est pas visible pour vous, ou il n'existe plus.",
    state: (title: string, state: string, owner: string) =>
      `Contrat « ${title} » : ${state.toLowerCase()}, suivi par ${owner}.`,
    inReview:
      "Il est en validation : il ne se modifie plus pendant la relecture.",
    terminated: "Il est résilié : il ne se modifie plus.",
    notWriter:
      "Seule la personne qui le suit, ou la direction, peut le modifier.",
    youMay: (list: string) => `Sur ce contrat, vous pouvez : ${list}.`,
    nothing: "Sur ce contrat, vous ne pouvez rien faire pour l'instant.",
    rights: {
      edit: "le modifier",
      submit: "le soumettre à validation",
      decide: "le valider ou le refuser",
      send: "l'envoyer pour signature",
      sign: "enregistrer sa signature",
      terminate: "le résilier",
    },
  },
  // Pages ruled by one permission.
  pages: {
    catalog: "créer et modifier les artistes et les titres",
    network: "ajouter et modifier les contacts du Réseau",
    sessions: "créer et mener les sessions studio",
    members: "gérer l'équipe et les accès",
    templates: "créer et modifier les modèles de contrat",
    validateTemplate: "valider un modèle de contrat",
    contracts: "créer et suivre des contrats",
    feedback: "lire les retours de toute l'équipe",
    ownFeedback: "Vous voyez vos propres retours et leur suite.",
  },
};
