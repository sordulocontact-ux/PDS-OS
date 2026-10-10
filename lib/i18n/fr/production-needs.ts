import type { RoleKey } from "@/lib/production/roles";

/** Marketing › Production: the human needs by family (parcours 3). */
export const productionNeeds = {
  title: "Équipes",
  description:
    "Les postes à tenir par équipe. PO suggère, vous confirmez le besoin, le nombre de personnes, qui le tient et sa disponibilité.",
  families: {
    direction: "Réalisation",
    camera: "Équipe image",
    sound: "Équipe son",
    performers: "Musiciens / artistes",
    production: "Production et régie",
  },
  roles: {
    assistant_director: "Assistant réalisation",
    script: "Scripte",
    camera_operator: "Cadre / prise de vues",
    dop: "Direction photo",
    gaffer: "Lumière",
    camera_assistant: "Assistance caméra",
    data_wrangler: "Data image",
    sound_engineer: "Ingénierie du son",
    boom_operator: "Prise de son",
    sound_assistant: "Assistance son",
    live_mix: "Mix live",
    musician: "Musicien",
    singer: "Chant",
    dancer: "Danse",
    actor: "Comédien",
    extra: "Figuration",
    coordinator: "Coordination",
    logistics: "Logistique",
    call_sheet: "Feuille de service",
    hospitality: "Accueil",
    other: "Autre",
  } satisfies Record<RoleKey, string>,
  director: {
    label: "Réalisateur",
    fromBrief: "Désigné sur le brief",
    missing: "À désigner sur le brief",
  },
  empty: {
    organize:
      "Aucun poste pour l'instant. Ajoutez-en un ou partez d'une suggestion de PO.",
    readOnly: "Aucun poste pour l'instant.",
  },
  count: (assigned: number, headcount: number) =>
    `${assigned} / ${headcount} affecté${assigned > 1 ? "s" : ""}`,
  unassigned: "Personne n'est encore affecté.",
  suggestions: {
    title: "Suggéré par PO",
    open: (role: string, reason: string) =>
      `Ajouter le poste ${role}, suggéré par PO : ${reason}`,
    reasons: {
      always: "base d'un tournage",
      multi: "plusieurs caméras",
      live: "captation live",
      one_take: "plan-séquence",
    },
    formNote: (reason: string) =>
      `Suggéré par PO (${reason}) : rien n'est enregistré tant que vous ne validez pas.`,
  },
  add: {
    open: "Ajouter un poste",
    title: (family: string) => `Ajouter un poste · ${family}`,
    description:
      "Le poste, le nombre de personnes qu'il demande et ce qu'il faut savoir.",
    submit: "Ajouter le poste",
    done: "Poste ajouté.",
  },
  edit: {
    title: (need: string) => `Modifier « ${need} »`,
    description:
      "Le nombre de personnes ne descend pas sous celles déjà affectées.",
    submit: "Enregistrer",
    done: "Poste modifié.",
  },
  fields: {
    role: "Poste",
    rolePlaceholder: "Choisir un poste",
    label: "Intitulé du poste",
    labelPlaceholder: "Ex. : chorégraphe, maquillage",
    speciality: "Spécialité",
    specialityPlaceholder: "Ex. : guitare, batterie, chœurs, rôle principal",
    specialityHint: "Instrument, voix ou rôle précis.",
    headcount: "Nombre de personnes",
    note: "Note",
    notePlaceholder: "Horaires, matériel, ce qu'il faut savoir",
  },
  missing: {
    role: "Choisissez le poste à tenir.",
    label: "Donnez un intitulé au poste : « Autre » n'en a pas.",
    headcount: (max: number) => `Indiquez un nombre entre 1 et ${max}.`,
    holder: "Choisissez qui tient ce poste.",
  },
  remove: {
    action: "Supprimer",
    title: "Supprimer ce poste ?",
    body: (need: string) => `« ${need} » et ses affectations seront supprimés.`,
    confirm: "Supprimer",
    pending: "Suppression…",
    done: "Poste supprimé.",
  },
  assign: {
    open: "Affecter",
    title: (need: string) => `Affecter · ${need}`,
    description:
      "Les profils connus du Réseau pour ce poste d'abord, puis les membres de PDS et le reste du Réseau.",
    holder: "Personne",
    submit: "Affecter",
    done: "Personne affectée.",
    full: "Poste complet",
  },
  holders: {
    known: "Profils connus",
    members: "Membres de PDS",
    network: "Reste du Réseau",
    placeholder: "Choisir une personne",
    withRoles: (name: string, roles: string) => `${name} · ${roles}`,
    nobody:
      "Personne d'autre à proposer : ajoutez le contact au Réseau, puis revenez ici.",
  },
  availability: {
    legend: "Disponibilité",
    values: {
      to_confirm: "À confirmer",
      available: "Disponible",
      unavailable: "Indisponible",
    },
    hints: {
      to_confirm: "Personne ne l'a encore confirmée.",
      available: "Confirmée : la personne sera là.",
      unavailable: "La personne ne peut pas.",
    },
    setBy: (who: string, date: string) => `Renseignée par ${who} le ${date}`,
    setAt: (date: string) => `Renseignée le ${date}`,
  },
  assignment: {
    menu: (name: string) => `Actions pour « ${name} »`,
    change: "Changer la disponibilité",
    changeTitle: (name: string) => `Disponibilité de ${name}`,
    changeDescription:
      "Ce que la personne a répondu. Votre nom et la date sont gardés.",
    changeSubmit: "Enregistrer",
    changed: "Disponibilité enregistrée.",
    note: "Note",
    notePlaceholder: "Ex. : disponible le matin seulement",
    remove: "Retirer du poste",
    removeTitle: "Retirer cette personne ?",
    removeBody: (name: string, need: string) =>
      `${name} ne tiendra plus le poste « ${need} ».`,
    removeConfirm: "Retirer",
    removePending: "Retrait…",
    removed: "Personne retirée du poste.",
  },
  needMenu: (need: string) => `Actions pour « ${need} »`,
  editAction: "Modifier",
  cancel: "Annuler",
  close: "Fermer",
  saving: "Enregistrement…",
  errors: {
    needFull:
      "Ce poste est complet : augmentez le nombre de personnes pour affecter quelqu'un de plus.",
    headcountBelowAssigned:
      "Le nombre de personnes ne peut pas descendre sous celles déjà affectées. Retirez d'abord une affectation.",
    alreadyAssigned: "Cette personne tient déjà ce poste.",
    notMember: "Cette personne n'est plus membre de PDS.",
    contactNotFound: "Ce contact n'est plus dans le Réseau.",
    notFound: "Ce poste n'existe plus. Rechargez la page.",
  },
} as const;
