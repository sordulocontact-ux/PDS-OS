/** Calls, audio upload, transcripts and reports (step 4). */
export const calls = {
  list: {
    title: "Calls",
    description:
      "Les échanges avec l'artiste et son équipe : enregistrement, transcription et compte rendu.",
    newCall: "Nouveau call",
    firstCallTitle: "Call de cadrage",
    emptyTitle: "Aucun call pour ce projet",
    emptyBodyReadOnly:
      "Les calls apparaîtront ici dès que le chef de projet responsable les aura enregistrés.",
    emptyBody:
      "Le cadrage part d'un call. Planifiez le premier échange, ou enregistrez-le maintenant : sa transcription et son compte rendu pré-rempliront le Brief.",
    columns: {
      title: "Call",
      date: "Date",
      status: "Traitement",
    },
  },
  // Calls page of the main navigation: every visible project's calls.
  all: {
    title: "Calls",
    description:
      "Tous les échanges enregistrés ou planifiés, sur l'ensemble de vos projets.",
    loadError: "Impossible de charger les calls. Réessayez.",
    views: {
      label: "Filtrer les calls",
      all: "Tous",
      upcoming: "À venir",
      past: "Passés",
    },
    columns: {
      title: "Call",
      date: "Date",
      status: "Traitement",
    },
    emptyTitle: "Aucun call pour l'instant",
    emptyBody:
      "Un call se crée depuis la page Calls d'un projet lancé ; une réunion interne, hors projet, avec « Nouvelle réunion ». Tous apparaîtront ici.",
    // Subtitle of a call without a project.
    internal: "Réunion interne",
    emptyUpcomingTitle: "Aucun call à venir",
    emptyPastTitle: "Aucun call passé",
    emptyViewBody: "Les autres calls restent visibles dans l'onglet « Tous ».",
    openProjects: "Voir les projets",
  },
  create: {
    title: "Nouveau call",
    fieldTitle: "Titre",
    titlePlaceholder: "Ex. Cadrage avec l'équipe de Nova Kessel",
    fieldDate: "Date et heure du call",
    dateHint:
      "Une date à venir planifie le call : vous l'enregistrerez le moment venu.",
    fieldLink: "Lien de visio",
    linkHint:
      "Facultatif. Meet, Zoom, Teams… : « Rejoindre » l'ouvrira le moment venu.",
    linkPlaceholder: "https://meet.google.com/…",
    submit: "Créer le call",
    pending: "Création…",
    cancel: "Annuler",
  },
  // Internal meeting: a call without a project (Calls page).
  meeting: {
    new: "Nouvelle réunion",
    title: "Nouvelle réunion",
    description:
      "Une réunion interne, hors projet. Seuls vous et les participants la verrez ; elle s'enregistre et se transcrit comme un call.",
    titlePlaceholder: "Ex. Point hebdo de l'équipe",
    fieldDate: "Date et heure",
    fieldAttendees: "Participants",
    attendeesHint:
      "Ils la verront dans leurs calls et seront prévenus. Vous en faites partie d'office.",
    noMembers: "Personne d'autre dans l'équipe pour l'instant.",
    submit: "Créer la réunion",
    pending: "Création…",
    cancel: "Annuler",
    attendees: "Participants",
    onlyCreator: "aucun invité",
    createdBy: (name: string) => `Organisée par ${name}`,
  },
  // Joining a call through its video link.
  join: {
    action: "Rejoindre",
    label: (title: string) => `Rejoindre « ${title} » dans un nouvel onglet`,
  },
  link: {
    add: "Ajouter un lien de visio",
    edit: "Modifier le lien de visio",
    title: "Lien de visio",
    description:
      "Le lien de la visio (Meet, Zoom, Teams…). Laissez vide pour le retirer.",
    save: "Enregistrer",
    saving: "Enregistrement…",
    cancel: "Annuler",
    close: "Fermer",
  },
  status: {
    // Display only: a draft call planned in the future.
    upcoming: "À venir",
    draft: "À enregistrer",
    uploaded: "Audio déposé",
    transcribing: "Transcription…",
    transcribed: "Transcrit",
    extracting: "Extraction…",
    ready: "Compte rendu prêt",
    failed: "Échec",
  },
  audio: {
    title: "Enregistrement",
    hint: "mp3, m4a, wav, webm, ogg ou flac — 100 Mo maximum. Au-delà de 25 Mo, la transcription exige le palier payant du fournisseur.",
    label: "Fichier audio",
    submit: "Déposer l'enregistrement",
    pending: "Envoi…",
    uploaded: "Enregistrement déposé.",
    size: (mb: string) => `${mb} Mo`,
    playerUnavailable: "Lecture impossible pour le moment.",
  },
  recorder: {
    title: "Enregistrer depuis l'application",
    reminder: "Prévenez les participants avant de lancer l'enregistrement.",
    sourceLabel: "Que faut-il enregistrer ?",
    sources: {
      tab: {
        label: "Un call en visio (Meet, Zoom…)",
        hint: "Choisissez l'onglet du call, puis cochez « Partager aussi l'audio de l'onglet ». Votre micro est ajouté automatiquement. Un casque évite l'écho.",
      },
      mic: {
        label: "Une réunion sur place ou un appel en haut-parleur",
        hint: "Seul le micro de cet appareil est enregistré.",
      },
    },
    tabUnavailable: "Disponible sur ordinateur, dans Chrome ou Edge.",
    start: "Commencer l'enregistrement",
    requesting: "Autorisation en cours…",
    recording: "Enregistrement en cours",
    paused: "En pause",
    pause: "Pause",
    resume: "Reprendre",
    stop: "Arrêter",
    endReminder:
      "En fin de call, cliquez sur « Arrêter » ici : raccrocher dans Meet ou Zoom n'arrête pas l'enregistrement.",
    silenceTitle: "Aucun son du call depuis 2 minutes.",
    silenceBody: "Le call est peut-être terminé.",
    silenceStop: "Arrêter l'enregistrement",
    silenceContinue: "Continuer",
    silenceTab: "(!) Aucun son du call",
    keepOpen:
      "Gardez cet onglet ouvert jusqu'à l'envoi : fermer la page perd l'enregistrement.",
    level: "Niveau sonore",
    review: "Écoutez si besoin, puis envoyez l'enregistrement.",
    duration: "Durée",
    size: "Taille",
    send: "Envoyer l'enregistrement",
    sending: "Envoi…",
    discard: "Recommencer",
    confirmDiscard: "Supprimer cet enregistrement ?",
    confirmDiscardAction: "Oui, supprimer",
    cancel: "Garder",
    sent: "Enregistrement envoyé. Transcription en cours…",
    freeTierNote:
      "Au-delà de 25 Mo (environ 1 h 45), la transcription exige le palier payant du fournisseur.",
    or: "Déposer un fichier audio à la place",
    errors: {
      unsupported:
        "Votre navigateur ne permet pas d'enregistrer. Utilisez Chrome ou Edge sur ordinateur.",
      permission_denied:
        "Accès refusé. Autorisez le micro (et le partage d'onglet) dans votre navigateur, puis réessayez.",
      no_tab_audio:
        "L'onglet a été partagé sans son. Recommencez en cochant « Partager aussi l'audio de l'onglet ».",
      device_error:
        "Impossible d'accéder au micro. Vérifiez qu'il est branché et libre.",
      too_large: "Enregistrement arrêté : la limite de 100 Mo est atteinte.",
    },
  },
  process: {
    title: "Traitement du call",
    steps: {
      audio: "Enregistrement reçu",
      transcript: "Transcription",
      report: "Compte rendu",
      brief: "Brief pré-rempli",
    },
    stepDone: "terminé",
    retry: "Réessayer",
    hint: "Quelques minutes pour un call long. Gardez cette page ouverte : vous arriverez sur le Cadrage à la fin.",
    meetingHint:
      "Quelques minutes pour une réunion longue. Gardez cette page ouverte : le compte rendu s'affichera ici.",
    done: "Compte rendu prêt.",
    briefFilled: "Brief pré-rempli depuis le call. Relisez et confirmez.",
  },
  page: {
    record: {
      title: "Enregistrer le call",
      description:
        "Lancez l'enregistrement au début du call et arrêtez-le à la fin. La suite est automatique.",
    },
    processing: {
      title: "Traitement en cours",
      description:
        "Transcription puis compte rendu. Le Brief sera pré-rempli avec ce qui s'est dit.",
    },
    done: {
      title: "Compte rendu prêt",
      description:
        "Ce qui s'est dit est proposé dans le Cadrage, à relire et confirmer.",
      toFraming: "Ouvrir le Cadrage",
    },
  },
  // The same steps for an internal meeting: no Brief to fill.
  meetingPage: {
    record: {
      title: "Enregistrer la réunion",
      description:
        "Lancez l'enregistrement au début et arrêtez-le à la fin. La suite est automatique.",
    },
    processing: {
      title: "Traitement en cours",
      description:
        "Transcription puis compte rendu : décisions et actions à transformer en tâches.",
    },
    done: {
      title: "Compte rendu prêt",
      description: "Écoutez l'enregistrement ; le compte rendu est plus bas.",
    },
  },
  agenda: {
    title: "Ordre du jour",
    total: (minutes: number) => `Durée totale estimée : environ ${minutes} min`,
    duration: (minutes: number) => `${minutes} min`,
    topicPlaceholder: "Point à aborder",
    add: "Ajouter un point",
    remove: "Retirer ce point",
    edit: "Modifier",
    save: "Enregistrer",
    cancel: "Annuler",
    saving: "Enregistrement…",
    empty: "Aucun point pour l'instant.",
  },
  // Decisions and next actions of the report; an action becomes a task.
  outcomes: {
    title: "Décisions et actions",
    description:
      "Relevées dans le compte rendu. Une action devient une tâche dès que vous choisissez son responsable et son échéance.",
    decisionsTitle: "Décisions",
    decisionsEmpty: "Aucune décision relevée dans ce call.",
    actionsTitle: "Actions",
    actionsEmpty: "Aucune action relevée dans ce call.",
    taskCreated: "Tâche créée",
    taskDone: "Tâche faite",
    task: (assignee: string, due: string, project: string) =>
      [assignee, due, project].filter(Boolean).join(" · "),
    notConverted: "Pas encore transformée en tâche.",
    // A meeting's action, for a member who owns no launched project.
    noProject:
      "Seul le chef de projet responsable d'un projet lancé crée ses tâches.",
    created: "Tâche créée.",
    because: (why: string) => `Pourquoi : ${why}`,
  },
  transcript: {
    title: "Transcription",
    empty: "Pas encore de transcription.",
  },
  report: {
    title: "Compte rendu",
    empty: "Pas encore de compte rendu.",
    history: (count: number) =>
      count > 1
        ? `Dernière version sur ${count} extractions.`
        : "Première extraction.",
    generatedAt: (date: string) => `Généré le ${date}`,
  },
  meta: {
    model: "Modèle",
    duration: "Traitement",
    audioLength: "Durée audio",
    tokens: "Jetons entrée / sortie",
  },
  back: "Tous les calls",
  errors: {
    invalid_input: "Vérifiez les champs du formulaire.",
    title_required: "Donnez un titre au call.",
    date_invalid: "Date invalide.",
    link_invalid: "Le lien de visio doit commencer par https://.",
    not_found: "Call introuvable ou inaccessible.",
    unauthorized: "Session expirée : reconnectez-vous.",
    forbidden:
      "Seul le chef de projet responsable peut modifier les calls de ce projet.",
    consent_required:
      "Le consentement doit être accordé avant de déposer un enregistrement.",
    audio_exists: "Un enregistrement est déjà déposé pour ce call.",
    no_file: "Choisissez un fichier audio.",
    file_too_large: "Fichier trop lourd : 100 Mo maximum.",
    unsupported_type: "Format non pris en charge. Utilisez un fichier audio.",
    upload_failed: "L'envoi du fichier a échoué. Réessayez.",
    busy: "Un traitement est déjà en cours pour ce call.",
    no_transcript: "Transcrivez l'enregistrement avant d'extraire.",
    audio_missing: "Aucun enregistrement déposé pour ce call.",
    audio_unavailable:
      "L'enregistrement n'a pas pu être relu depuis le stockage. Réessayez, ou déposez-le à nouveau.",
    audio_too_large:
      "Fichier refusé par le service de transcription : le palier gratuit est limité à 25 Mo (100 Mo avec le palier payant). Compressez l'audio ou passez au palier payant.",
    provider_quota:
      "Quota du fournisseur atteint. Réessayez dans quelques minutes.",
    provider_error:
      "Le fournisseur a refusé la requête (clé, format ou panne). Détail dans la console du serveur.",
    transcript_empty: "La transcription est vide : aucune parole détectée.",
    save_failed: "Le résultat n'a pas pu être enregistré. Réessayez.",
    network: "Le serveur ne répond pas.",
    unknown: "Une erreur inattendue est survenue.",
  },
} as const;
