/** Calls, audio upload, transcripts and reports (step 4). */
import { calendar, details, schedule } from "./calls-schedule";
import { microphoneErrors } from "./microphone";

export const calls = {
  schedule,
  calendar,
  details,
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
    search: {
      label: "Rechercher un call",
      placeholder: "Titre, projet…",
      noResult: (query: string) => `Aucun call ne correspond à « ${query} ».`,
    },
    filters: {
      projectLabel: "Projet",
      projectAll: "Tous les projets",
      statusLabel: "Traitement",
      statusAll: "Tous les états",
    },
    filtersEmpty: "Aucun call ne correspond à ces filtres.",
    filtersEmptyBody: "Retirez un filtre pour élargir la liste.",
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
    linkHint: "Meet, Zoom, Teams… : « Rejoindre » l'ouvrira le moment venu.",
    linkPlaceholder: "https://meet.google.com/…",
    fieldAttendees: "Participants",
    attendeesHint:
      "L'équipe du projet. Les personnes choisies sont prévenues et le voient dans leurs calls à venir.",
    noTeam: "Personne d'autre dans l'équipe du projet pour l'instant.",
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
    part: (n: number) => `Partie ${n}`,
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
    micSilent:
      "On n'entend rien depuis 30 secondes : vérifiez que le micro n'est pas coupé.",
    quiet:
      "Cet enregistrement semble muet : presque aucun son n'a été entendu. Écoutez-le avant de l'envoyer.",
    sendAnyway: "Envoyer quand même",
    keepOpen:
      "Sauvegardé toutes les 20 secondes : si la page se ferme, la partie sauvegardée vous attend ici.",
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
    errors: microphoneErrors,
    // Before any prompt: what the browser already says (PROJ-BUG-01).
    diagnosis: "Avant de commencer",
    starting: "Démarrage du micro…",
    // Stopped without the user: kept, said, and what can follow.
    interruptions: {
      permission_revoked:
        "L'accès au micro a été retiré pendant l'enregistrement.",
      device_lost: "Le micro s'est déconnecté pendant l'enregistrement.",
      recorder_failed:
        "Le navigateur a arrêté l'enregistrement : plus aucun son ne lui parvenait.",
    },
    savedLive: (clock: string) => `Sauvegardé : ${clock}`,
    pendingLive: (clock: string) => `${clock} en attente de sauvegarde`,
    saveFailing:
      "La sauvegarde ne passe plus (connexion ?). Elle reprend seule : gardez cet onglet ouvert.",
    savingRest: "Sauvegarde des dernières secondes…",
    recovery: {
      title: "Enregistrement interrompu",
      saved: (clock: string, at: string) =>
        `${clock} sauvegardées, jusqu'à ${at}.`,
      parts: (n: number) =>
        `En ${n} parties : elles seront transcrites dans l'ordre.`,
      nothingSaved: "Rien n'a été sauvegardé.",
      gapsTitle: "Audio manquant",
      gap: (from: string, to: string, minutes: number) =>
        `Entre ${from} et ${to} (environ ${minutes} min) : ce passage ne sera pas dans la transcription.`,
      resume: "Reprendre l'enregistrement",
      retry: "Réessayer",
      sendSaved: "Envoyer la partie sauvegardée",
      discard: "Supprimer",
      confirmDiscard:
        "Supprimer ce qui est sauvegardé ? Il ne sera ni transcrit ni résumé.",
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
    // Editing a point and its questions (PROJ-UX-03).
    min: "min",
    topicLabel: (n: number) => `Point ${n}`,
    minutesLabel: (n: number) => `Durée du point ${n}, en minutes`,
    moveUp: (n: number) => `Monter le point ${n}`,
    moveDown: (n: number) => `Descendre le point ${n}`,
    questionLabel: (n: number) => `Question ${n}`,
    questionUp: (n: number) => `Monter la question ${n}`,
    questionDown: (n: number) => `Descendre la question ${n}`,
    questionRemove: (n: number) => `Retirer la question ${n}`,
    addQuestion: "Ajouter une question",
    feeds: (dimension: string) => `Alimente le cadrage : ${dimension}`,
    edited: (name: string | null, date: string) =>
      `Modifié${name ? ` par ${name}` : ""} le ${date}`,
    suggested:
      "Questions proposées par PO à partir de ce qui manque : modifiez, retirez ou complétez-les. Elles entrent dans l'ordre du jour quand vous lancez le call.",
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
  // A project's call names its project under the date (link to its overview).
  project: "Projet",
  // « Préparer un échange » (Cadrage, Stratégie): topics and participants.
  prepare: {
    addTopic: "Ajouter un sujet",
    topicPlaceholder: "Un sujet à aborder",
    removeTopic: (topic: string) => `Retirer « ${topic} »`,
    minutes: (n: number) => `${n} min`,
    // The time of a topic, editable in place.
    minutesUnit: "min",
    minutesLabel: (topic: string) => `Durée de « ${topic} », en minutes`,
    total: (n: number) => `Environ ${n} min`,
    participants: "Participants",
    addParticipant: "Ajouter",
    // One search over the team and the Réseau (UX test of 09/10/2026).
    searchLabel: "Ajouter un participant",
    participantPlaceholder: "Chercher dans l'équipe ou le Réseau",
    teamDetail: "Équipe du projet",
    noResult: (query: string) =>
      `Personne ne s'appelle « ${query} » dans l'équipe ni dans le Réseau.`,
    allPicked: "Tout le monde est déjà ajouté.",
    removeParticipant: (name: string) => `Retirer ${name}`,
    // The summary checked before « Créer l'échange » (components/calls/call-recap.tsx).
    recap: {
      heading: "Récapitulatif",
      body: "Rien n'est créé tant que vous n'avez pas confirmé.",
      title: "Titre",
      when: "Date",
      format: "Format",
      link: "Lien",
      purpose: "Objectif",
      participants: "Participants",
      topics: "Sujets",
      none: "Aucun",
    },
  },
  errors: {
    invalid_input: "Vérifiez les champs du formulaire.",
    title_required: "Donnez un titre au call.",
    date_invalid: "Date invalide.",
    link_invalid: "Le lien de visio doit commencer par https://.",
    end_before_start: "La fin du call doit venir après son début.",
    slot_too_long: "Un call dure 12 heures au plus : vérifiez les heures.",
    guest_email_invalid:
      "Une adresse invitée n'est pas valide : retirez-la et tapez-la à nouveau.",
    guest_without_email:
      "Un contact invité n'a pas d'e-mail dans le Réseau : retirez-le, ou tapez son adresse.",
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
    // The member's daily limit of requests to PO (lib/ai/quota.ts).
    ai_quota:
      "Limite du jour de requêtes à PO atteinte : le compteur repart à zéro à minuit ; le directeur général peut l'augmenter dans Équipe.",
    provider_error:
      "Le service de transcription n'a pas répondu. Réessayez dans un moment ; si ça continue, prévenez l'équipe technique.",
    transcript_empty:
      "Rien d'exploitable dans l'enregistrement : aucune parole n'a été entendue (micro coupé ?). Aucun compte rendu n'a été fait : réenregistrez, ou importez un autre fichier.",
    save_failed: "Le résultat n'a pas pu être enregistré. Réessayez.",
    network: "Le serveur ne répond pas.",
    unknown: "Une erreur inattendue est survenue.",
  },
  // PROJ-AMEL-01: what a call produced, its closing and its sharing.
  closure: {
    title: "Compte rendu et clôture",
    description:
      "Les cinq sorties du call, puis sa clôture : le compte rendu figé, partageable sans la transcription ni l'audio.",
    outputs: {
      transcript: "Transcription",
      summary: "Résumé",
      decisions: (n: number) =>
        n === 0 ? "Aucune décision" : n === 1 ? "1 décision" : `${n} décisions`,
      actions: (n: number, tasks: number) =>
        n === 0
          ? "Aucune action"
          : `${n === 1 ? "1 action" : `${n} actions`}, ${tasks === n ? "toutes en tâches" : `${tasks} en tâche${tasks > 1 ? "s" : ""}`}`,
      proposals: (n: number, pending: number) =>
        n === 0
          ? "Aucune proposition de cadrage"
          : `${n === 1 ? "1 proposition de cadrage" : `${n} propositions de cadrage`}${pending ? `, ${pending} à revoir` : ", toutes revues"}`,
      ready: "Prêt",
      missing: "Pas encore",
    },
    close: "Clôturer le call",
    correct: "Corriger le compte rendu",
    closeTitle: "Clôturer le call ?",
    closeBody:
      "Le compte rendu est figé tel quel, en une version datée. Une correction plus tard en crée une nouvelle, la précédente reste.",
    unreviewed: (actions: number, proposals: number) =>
      [
        actions
          ? `${actions === 1 ? "1 action n'est" : `${actions} actions ne sont`} pas encore en tâche`
          : null,
        proposals
          ? `${proposals === 1 ? "1 proposition de cadrage reste" : `${proposals} propositions de cadrage restent`} à revoir`
          : null,
      ]
        .filter(Boolean)
        .join(" ; ") +
      ". Vous pouvez clôturer quand même : ce sera dit dans le compte rendu.",
    allReviewed: "Tout est revu : actions en tâches, propositions traitées.",
    noteLabel: "Note de clôture",
    closed: "Call clôturé.",
    closedOn: (version: number, date: string, name: string) =>
      `Version ${version}, clôturée le ${date} par ${name}`,
    leftToReview: (text: string) => `À la clôture : ${text}`,
    share: "Partager le compte rendu",
    shareTitle: "Partager le compte rendu",
    shareBody:
      "Les membres choisis sont prévenus et lisent ce compte rendu seulement. Pour les autres, PDS OS prépare un e-mail que vous envoyez de votre messagerie, avec le PDF.",
    scope: "Ce qui est partagé",
    scopes: {
      full: "Le compte rendu complet",
      summary: "La synthèse",
    },
    scopeHints: {
      full: "Résumé, décisions, actions avec responsables et échéances, points ouverts.",
      summary: "Le résumé et les décisions.",
    },
    members: "Membres de l'équipe",
    noMembers: "Aucun autre membre.",
    emails: "Adresses e-mail extérieures",
    emailsHint: "Une adresse par ligne : les invités du call sont proposés.",
    recipientsMissing: "Choisissez au moins un destinataire.",
    emailInvalid: (email: string) =>
      `« ${email} » n'est pas une adresse e-mail.`,
    shared: "Compte rendu partagé.",
    mailto: "Écrire l'e-mail",
    pdf: "Télécharger le PDF",
    history: "Historique",
    sharedLine: (
      name: string,
      date: string,
      scope: string,
      recipients: string,
    ) =>
      `${name} a partagé ${scope.toLowerCase()} le ${date} avec ${recipients}`,
    version: (n: number) => `Version ${n}`,
    report: {
      heading: (title: string, date: string) =>
        `Compte rendu — ${title} (${date})`,
      meta: (date: string, version: number) =>
        `Call du ${date} · compte rendu, version ${version}`,
      summary: "Résumé",
      decisions: "Décisions",
      actions: "Actions",
      open: "Points ouverts",
      due: (date: string) => `avant le ${date}`,
      subject: (title: string) => `Compte rendu : ${title}`,
    },
    page: {
      title: "Compte rendu",
      notShared: "Aucun compte rendu de ce call ne vous a été partagé.",
    },
    errors: {
      not_closed: "Clôturez le call avant de partager son compte rendu.",
      no_report: "Le call n'a pas encore de compte rendu.",
      failed: "L'action n'a pas pu être faite. Réessayez.",
    },
  },
} as const;
