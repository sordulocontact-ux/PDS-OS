/**
 * Facts of PO's read functions on contracts, the Juridique, a title's file
 * and the Réseau (lib/assistant/read/). Written for the user, sentences
 * complete: they are model context and shown under PO's answer.
 */
export const assistantReadLegal = {
  contracts: {
    none: "Aucun contrat visible ne correspond à cette recherche.",
    unreadable: "Les contrats n'ont pas pu être lus pour l'instant.",
    artistNotFound: (name: string) =>
      `Aucun artiste des contrats visibles ne correspond à « ${name} ».`,
    count: (n: number) =>
      n === 1 ? "1 contrat correspond." : `${n} contrats correspondent.`,
    line: (title: string, type: string, state: string) =>
      `« ${title} » (${type}) : ${state}.`,
    owner: (name: string) => `Responsable du contrat : ${name}.`,
    parties: (names: string) => `Parties : ${names}.`,
    noParty: "Aucune partie n'est renseignée.",
    project: (title: string) => `Projet : ${title}.`,
    artist: (name: string) => `Artiste : ${name}.`,
    due: (day: string, late: boolean) =>
      late ? `Échéance dépassée : le ${day}.` : `Échéance : le ${day}.`,
    ends: (day: string) => `Fin du contrat : le ${day}.`,
    signedOn: (day: string) => `Signé le ${day}.`,
    reviewer: (name: string) => `Validation : ${name}.`,
    youCan: (actions: string) => `Vous pouvez : ${actions}.`,
    youCannot: "Vous ne pouvez rien y faire vous-même pour l'instant.",
    actions: {
      edit: "le modifier",
      submit: "le soumettre à validation",
      decide: "le valider ou demander des modifications",
      send: "l'envoyer pour signature",
      sign: "enregistrer sa signature",
      terminate: "le résilier",
    } as Record<string, string>,
  },
  legal: {
    noRight:
      "Le Juridique n'est visible qu'avec le droit de le gérer : ce droit manque à cet utilisateur, rien n'a été lu.",
    notLaunched: (project: string) =>
      `Le Juridique de « ${project} » n'est pas encore lancé par le Plan du projet.`,
    head: (project: string) => `Juridique du projet « ${project} ».`,
    step: (title: string, state: string) => `Étape « ${title} » : ${state}.`,
    stepActor: (name: string, todo: string) => `À faire par ${name} : ${todo}.`,
    states: {
      done: "faite",
      current: "en cours",
      waiting: "en attente d'un retour",
      rework: "à revoir",
      blocked: "verrouillée",
      upcoming: "pas encore ouverte",
      obsolete: "plus nécessaire",
    } as Record<string, string>,
    inventory: (known: number, toConfirm: number, missing: number) =>
      `État des lieux : ${known} connu${known > 1 ? "s" : ""}, ${toConfirm} à confirmer, ${missing} manquant${missing > 1 ? "s" : ""}.`,
    fact: (section: string, label: string, state: string, detail: string) =>
      `${section} : ${label}${detail}, ${state}.`,
    sections: {
      titles: "Titres",
      people: "Personnes",
      splits: "Répartitions",
      agreements: "Contrats",
      declarations: "Déclarations",
      flags: "Points du Cadrage",
    } as Record<string, string>,
    sectionFailed: (section: string) =>
      `La section « ${section} » de l'État des lieux n'a pas pu être lue.`,
    splitsHidden:
      "Les répartitions ne sont pas lisibles sans le droit de gérer le catalogue.",
    clearance: (work: string, element: string, state: string, who: string) =>
      `Emprunt « ${work} » (${element}) : ${state}${who}. Tant qu'il n'est pas sécurisé ou abandonné, il reste à régler avant la sortie.`,
    clearanceClosed: (work: string, element: string, state: string) =>
      `Emprunt « ${work} » (${element}) : ${state}.`,
    clearanceNone: "Aucun emprunt ni sample n'est suivi pour ce projet.",
    clearanceStates: {
      cleared: "sécurisé",
      abandoned: "abandonné",
      refused: "refusé",
      action_required: "action requise",
      to_investigate: "à instruire",
      rightsholders_identified: "ayants droit identifiés",
      contacted: "ayants droit contactés",
      waiting_external: "en attente de réponse",
      negotiating: "en négociation",
      agreement_reached: "accord trouvé",
      document_pending: "contrat en cours",
      signed: "contrat signé",
    } as Record<string, string>,
    responsible: (name: string) => ` (responsable : ${name})`,
    sacem: (title: string, state: string) =>
      `Démarche SACEM de « ${title} » : ${state}.`,
    sacemStates: {
      none: "pas encore ouverte",
      collecting_data: "données à compléter",
      ready_to_generate: "prête à générer",
      document_ready: "bulletin généré",
      signatures_pending: "signatures en cours",
      ready_to_submit: "prête à déposer",
      submitted: "déposée",
      processing: "en traitement",
      completed: "enregistrée",
      action_required: "correction demandée",
      rejected: "rejetée",
    } as Record<string, string>,
    planNotLaunched: "Le plan d'action du Juridique n'est pas encore lancé.",
    planItem: (label: string, state: string, who: string, due: string) =>
      `Démarche « ${label} » : ${state}${who}${due}.`,
    planStates: {
      action_now: "à faire maintenant",
      waiting_external: "en attente d'un retour extérieur",
      blocked: "bloquée par une autre démarche",
      done: "faite",
      obsolete: "plus nécessaire",
    } as Record<string, string>,
    planWho: (name: string) => `, responsable : ${name}`,
    planNoWho: ", sans responsable",
    planDue: (day: string, late: boolean) =>
      late ? `, échéance dépassée (le ${day})` : `, échéance le ${day}`,
    readiness: {
      no: (n: number) =>
        n === 1
          ? "1 point bloque la livraison."
          : `${n} points bloquent la livraison.`,
      risk: "Rien ne bloque, des points restent à suivre.",
      ok: "Tout est en ordre pour la livraison.",
    },
    readinessLabel: "Prêt pour la sortie",
    blocking: (label: string, reason: string) =>
      `Bloque la sortie : ${label}. ${reason}`,
  },
  title: {
    notFound: (name: string) =>
      `Aucun titre visible ne correspond à « ${name} ».`,
    which:
      "Aucun titre nommé et PO n'a pas été ouvert depuis la fiche d'un titre : demande de quel titre il s'agit.",
    head: (title: string, artists: string) =>
      `Fiche du titre « ${title} » (${artists}).`,
    audio: (state: string) => `État audio : ${state}.`,
    audioUnknown: "L'état audio n'est pas renseigné.",
    isrc: (isrc: string) => `ISRC : ${isrc}.`,
    noIsrc: "L'ISRC n'est pas renseigné.",
    iswc: (iswc: string) => `ISWC de l'œuvre : ${iswc}.`,
    noIswc: "L'ISWC n'est pas renseigné.",
    holder: (holder: string, year: string, state: string) =>
      `Titulaire du ℗ : ${holder}${year} (${state}).`,
    noHolder: "Le titulaire du ℗ n'est pas renseigné.",
    holderYear: (year: number) => `, ${year}`,
    holderConfirmed: (by: string) => `confirmé${by}`,
    holderBy: (name: string) => ` par ${name}`,
    holderProposed: "proposé, à confirmer",
    contributors: (list: string) => `Contributeurs : ${list}.`,
    noContributors: "Aucun contributeur n'est crédité.",
    contributor: (name: string, roles: string) => `${name} (${roles})`,
    splits: {
      master: "Splits du master",
      publishing: "Splits de l'édition",
    } as Record<string, string>,
    splitComplete: (label: string, parties: string) =>
      `${label} : complets à 100 % (${parties}).`,
    splitIncomplete: (label: string, remaining: string, parties: string) =>
      `${label} : incomplets (${parties}), il reste ${remaining} à répartir.`,
    splitEmpty: (label: string) => `${label} : aucune part renseignée.`,
    splitsHidden:
      "Les splits ne sont lisibles qu'avec le droit de gérer le catalogue : ils n'ont pas été lus.",
    declarations: (list: string) => `Déclarations : ${list}.`,
    noDeclarations: "Aucune déclaration n'est notée.",
    declaration: (organism: string, status: string) => `${organism} ${status}`,
    statuses: {
      to_verify: "à vérifier",
      to_do: "à effectuer",
      submitted: "déposée",
      confirmed: "confirmée",
      to_correct: "à corriger",
      rejected: "refusée",
      not_applicable: "non applicable",
    } as Record<string, string>,
    final: {
      yes: "Le Master final est validé.",
      no: "Le Master final n'est pas encore validé.",
    },
    projects: (list: string) => `Projets : ${list}.`,
    noProjects: "Le titre n'est dans aucun projet visible.",
    missing: (list: string) => `Reste à faire au dossier : ${list}.`,
    allDone: "Toutes les pièces du dossier sont faites.",
    labels: {
      isrc: "ISRC",
      rightsHolder: "titulaire du ℗",
      masterSplits: "splits du master",
      publishingSplits: "splits de l'édition",
      masterFile: "Master final",
      iswc: "ISWC",
      contributors: "contributeurs",
      declarations: "déclarations",
    } as Record<string, string>,
  },
  network: {
    none: "Aucun contact du Réseau ne correspond à cette recherche.",
    unreadable: "Le Réseau n'a pas pu être lu pour l'instant.",
    count: (n: number) =>
      n === 1 ? "1 contact correspond." : `${n} contacts correspondent.`,
    corrected: (said: string, actual: string) =>
      `« ${said} » a été compris comme « ${actual} » : à vérifier.`,
    kind: { person: "Personne", organization: "Organisation" },
    line: (name: string, kind: string, roles: string) =>
      `${name} : ${kind.toLocaleLowerCase("fr")}${roles ? `, ${roles}` : ""}.`,
    structure: (name: string) => `Structure : ${name}.`,
    email: (email: string) => `E-mail : ${email}.`,
    noEmail: "Pas d'e-mail renseigné.",
    phone: (phone: string) => `Téléphone : ${phone}.`,
    noPhone: "Pas de téléphone renseigné.",
    city: (city: string) => `Ville : ${city}.`,
    members: (names: string) => `Personnes de cette organisation : ${names}.`,
    contract: (title: string, status: string, role: string) =>
      `Contrat « ${title} » : ${status}${role}.`,
    contractRole: (role: string) => ` (rôle : ${role})`,
    project: (title: string, artist: string) =>
      `Projet : ${title}${artist ? ` (${artist})` : ""}.`,
    awaited: (title: string, n: number) =>
      n === 1
        ? `Dans « ${title} », 1 chose attend ce contact.`
        : `Dans « ${title} », ${n} choses attendent ce contact.`,
  },
};
