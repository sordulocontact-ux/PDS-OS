/** Framing stage page and the Brief (step 5). */
export const framing = {
  title: "Cadrage",
  description:
    "Le Brief de la sortie : objectif, temporalité, besoins, cadre, équipe.",
  proposed: "proposé · à confirmer",
  // Never « from a call »: the source may be the initial context, a
  // dictation or a call (UX test of 09/10/2026); said by `proposedFrom`.
  proposedHint: "Proposé par PO. Relisez, puis confirmez ou écartez.",
  proposedFrom: (source: string) =>
    `Proposé par PO · ${source}. Relisez, puis confirmez ou écartez.`,
  empty: "Pas encore renseigné.",
  needsCall: {
    title: "Du call au Brief validé",
    body: "Commencez par un call pour que PO prépare l'ordre du jour et pré-remplisse le Brief, ou passez directement au Brief si l'échange a déjà eu lieu ailleurs.",
    bodyReadOnly:
      "Le Brief s'ouvrira dès que le chef de projet aura préparé ou enregistré un call, ou aura commencé le Brief en amont.",
    withCall: {
      title: "Préparer un call de cadrage",
      body: "PO structure l'ordre du jour (objectif, temporalité, cadre, besoins, équipe) et son temps approximatif ; son compte rendu pré-remplira le Brief.",
      action: "Préparer un call de cadrage",
    },
    withoutCall: {
      title: "Commencer en amont",
      body: "Aucun call n'a eu lieu : remplissez le Brief à la main, sans pré-remplissage.",
      action: "Commencer en amont",
    },
  },
  fields: {
    objective: "Objectif",
    timing: "Temporalité",
    frame: "Cadre",
  },
  actions: {
    confirm: "Confirmer",
    reject: "Rejeter",
    edit: "Modifier",
    fill: "Renseigner",
    save: "Enregistrer",
    cancel: "Annuler",
    add: "Ajouter",
    working: "…",
  },
  provenance: {
    from: "Source :",
    at: "à",
    manual: "Saisi à la main",
    dictatedBy: (name: string | null) =>
      name ? `Dicté par ${name}` : "Dicté à la voix",
    missing:
      "Citation introuvable dans la transcription : à vérifier avant de confirmer.",
    // A value's state and source, said the same way everywhere (PROJ-BUG-02).
    suggestion: "Suggestion de PO · à confirmer",
    toVerify: (label: string) => `Repris de ${label} · à vérifier`,
    confirmed: (name: string | null, date: string | null) =>
      `Confirmé${name ? ` par ${name}` : ""}${date ? ` le ${date}` : ""}`,
    notFound: "Source introuvable",
    // MKT-S1-09: a draft written by PO, with where it leans and how sure.
    generatedFrom: (label: string) =>
      label ? `Rédigé par PO d'après ${label}` : "Rédigé par PO",
    confidence: {
      high: "Confiance haute",
      medium: "Confiance moyenne",
      low: "Confiance faible · à relire",
    },
    openPassage: (time: string) => `Voir le passage (${time})`,
    openTranscript: "Voir la transcription",
  },
  import: {
    title: "Importer depuis un call",
    hint: "Pré-remplit le Brief à partir du dernier compte rendu d'un call. Rien n'est confirmé automatiquement.",
    empty:
      "Aucun compte rendu disponible. Enregistrez un call dans l'onglet Calls.",
    submit: "Importer",
    done: "Importé",
  },
  dictation: {
    kinds: {
      brief: (field: string, isEdit: boolean) =>
        `${field} · ${isEdit ? "modification" : "à renseigner"}`,
      need: (family: string) => `Nouveau besoin · ${family}`,
      constraint: "Nouvelle ligne de cadre",
      team: "Nouvelle personne dans l'équipe",
      open_point: "Nouveau point ouvert",
    },
    noRole: "rôle non précisé",
  },
  needs: {
    title: "Besoins",
    hint: "Identifier un besoin n'engage rien : aucune mission, dépense ou activation n'est créée ici.",
    empty: "Aucun besoin identifié.",
    label: "Besoin",
    family: "Famille",
    identified: "Identifié",
    committed: "Engagé",
    commit: "Engager",
    uncommit: "Repasser en identifié",
    families: {
      creation_content: "Création & contenus",
      promotion_distribution: "Promotion & diffusion",
      experiences_activations: "Expériences & activations",
      other: "Autre",
    },
    presets: {
      clip: "Clip",
      social_content: "Contenus réseaux",
      cover_visual_identity: "Cover / identité visuelle",
      photoshoot: "Shooting photo",
      press_relations: "Relations presse / médias",
      influence_campaign: "Campagne influence / créateurs",
      playlisting: "Playlisting",
      marketing_campaign: "Campagne marketing",
      live_showcase: "Live / showcase",
      event: "Événement",
    },
    other: "Autre",
  },
  team: {
    title: "Équipe",
    empty: "Personne pour l'instant.",
    name: "Nom",
    role: "Rôle",
  },
  openPoints: {
    title: "Points ouverts",
    hint: "Une décision non prise : pas de responsable, pas d'échéance.",
    empty: "Aucun point ouvert.",
    question: "Question",
    resolve: "Trancher",
    resolution: "Décision prise",
    resolved: "Tranchés",
  },
  tasks: {
    title: "Actions",
    proposedTitle: "Actions proposées depuis les calls",
    proposedHint:
      "Une tâche a toujours un responsable et une échéance : à vous de les choisir.",
    empty: "Aucune tâche.",
    taskTitle: "Tâche",
    assignee: "Responsable",
    dueDate: "Échéance",
    // A call outside any project: which project the task goes to.
    project: "Projet",
    create: "Créer la tâche",
    done: "Faite",
  },
  validation: {
    title: "Validation du Brief",
    states: {
      not_started: "Pas commencé",
      in_progress: "En cours",
      awaiting_validation: "En attente de validation",
      validated: "Validé",
    },
    start: "Commencer le cadrage",
    validator: "Valideur",
    note: "Message",
    request: "Demander la validation",
    requested: "Validation demandée.",
    waitingFor: (name: string) => `En attente de ${name}.`,
    youDecide: "Vous êtes le valideur.",
    comment: "Commentaire (obligatoire pour refuser)",
    approve: "Valider",
    decline: "Refuser",
  },
  errors: {
    invalid_input: "Saisie invalide.",
    // MKT-S1-07: a contract or a right is followed in the Juridique.
    legal_not_lever:
      "C'est un prérequis juridique, pas un levier marketing : il est suivi dans le Juridique et apparaît ici comme dépendance.",
    not_found: "Élément introuvable.",
    already_imported: "Ce compte rendu a déjà été importé.",
    invalid_transition: "Cette action n'est pas possible dans l'état actuel.",
    no_validator:
      "Aucun directeur général actif : personne à qui demander la validation.",
    deliveries_open:
      "Chaque livrable doit être livré avant de demander la validation de la production.",
    review_required: "Écrivez le bilan avant de demander la clôture du projet.",
    multiple_validators:
      "Plusieurs directeurs généraux actifs : contactez-en un directement.",
    not_the_validator: "Seul le valideur désigné peut décider.",
    reason_required: "Un motif est obligatoire.",
    previous_stage_not_validated:
      "L'étape précédente doit être validée avant de commencer celle-ci.",
    framing_requires_call:
      "Le cadrage part d'un call : enregistrez-en un et obtenez son compte rendu d'abord.",
    stage_locked:
      "Cette étape n'est modifiable que pendant qu'elle est en cours (ni avant, ni une fois soumise ou validée).",
    lever_not_selected: "Un livrable se rattache à un levier retenu.",
    lever_has_deliverables:
      "Ce levier a des livrables engagés : retirez-les avant de changer son état.",
    version_superseded:
      "Une version plus récente a été déposée entre-temps : relisez celle-ci.",
    cannot_deposit:
      "Impossible de déposer ici : la conception n'est pas en cours, ou ce livrable ne vous est pas confié.",
    file_too_large:
      "Fichier trop lourd (50 Mo au plus) : déposez plutôt un lien vers le fichier.",
    upload_failed: "L'envoi du fichier a échoué. Réessayez.",
    nothing_to_import:
      "Ce compte rendu ne contient aucun élément de stratégie.",
    forbidden: "Seul le chef de projet responsable modifie ce projet.",
    brief_incomplete:
      "Le cadrage n'est pas complet : confirmez ce qui reste à confirmer et répondez aux questions obligatoires.",
    brief_outdated:
      "Le cadrage a changé depuis cette version du Brief : mettez le Brief à jour avant de l'envoyer.",
    brief_required:
      "Générez d'abord le Brief : c'est lui que le valideur relit.",
    dimensions_required: "Choisissez au moins une dimension à rouvrir.",
    plan_required:
      "La Stratégie démarre au lancement du plan du projet, dans le Cadrage.",
    plan_already_launched: "Le plan de ce projet est déjà lancé.",
    framing_not_validated: "Le plan se construit une fois le Brief validé.",
    invalid_owner: "Ce responsable n'est pas membre de l'équipe.",
    already_decided: "Cette version a déjà reçu une décision.",
    task_exists:
      "Une tâche existe déjà pour cette action du call : elle est dans le Travail.",
    recommendation_settled:
      "Cette recommandation a déjà été traitée : elle est dans « Déjà traitées ».",
    reminder_too_soon:
      "Cette personne a déjà été relancée il y a moins de 12 heures.",
    invalid_reviewer:
      "Seuls les directeurs créatifs du projet peuvent être ajoutés comme valideurs.",
    brief_not_validated: "Le Brief de sortie doit d'abord être validé.",
    brief_pending:
      "Le Brief de sortie attend ses valideurs : rien de final n'est généré d'ici là.",
    strategy_incomplete:
      "Complétez les dimensions de la stratégie : le Brief de sortie n'est pas encore établi.",
    not_shareable: "Ce document ne se partage pas par lien.",
    requests_required: "Ajoutez au moins une demande de correction.",
    requests_open:
      "Une demande de correction obligatoire est encore ouverte : elle doit être corrigée, justifiée ou levée d'abord.",
    brief_unchanged:
      "Cette version dit exactement la même chose que la précédente : corrigez le cadrage, ou expliquez pourquoi vous la renvoyez telle quelle.",
    justification_required:
      "Rien n'a changé à cet endroit depuis la demande : mettez le Brief à jour, ou écrivez pourquoi vous ne le modifiez pas.",
    item_not_found: "Cette étape n'existe plus.",
    // MKT-S1-16.
    critical_alert_unaccepted:
      "Acceptez chaque alerte critique avant de valider, ou demandez une modification.",
    invalid_reserve:
      "Chaque réserve a un texte, un responsable de l'équipe et une échéance à venir.",
    deliverable_not_planned:
      "Un livrable sans responsable ni échéance ne devient pas une tâche : planifiez-le d'abord.",
    // PO could not read the initial context (lib/framing/actions/start.ts).
    context_unread:
      "PO n'a pas pu lire le contexte. Réessayez dans un instant.",
    generic: "Une erreur est survenue. Réessayez.",
  },
} as const;
