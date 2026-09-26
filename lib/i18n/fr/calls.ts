/** Calls, audio upload, transcripts and reports (step 4). */
export const calls = {
  list: {
    title: "Calls",
    description:
      "Les échanges avec l'artiste et son équipe : enregistrement, transcription et compte rendu.",
    newCall: "Nouveau call",
    emptyTitle: "Aucun call pour ce projet",
    emptyBodyReadOnly:
      "Les calls apparaîtront ici dès que le chef de projet responsable les aura enregistrés.",
    emptyBody:
      "Créez un call pour y déposer son enregistrement et obtenir une transcription et un compte rendu à valider.",
    columns: {
      title: "Call",
      date: "Date",
      consent: "Consentement",
      status: "Traitement",
    },
  },
  create: {
    title: "Nouveau call",
    fieldTitle: "Titre",
    titlePlaceholder: "Ex. Cadrage avec l'équipe de Nova Kessel",
    fieldDate: "Date et heure du call",
    consentLegend: "Consentement à l'enregistrement",
    consentHint:
      "Chaque participant doit avoir accepté l'enregistrement avant tout dépôt audio.",
    submit: "Créer le call",
    pending: "Création…",
    cancel: "Annuler",
  },
  consent: {
    title: "Consentement à l'enregistrement",
    label: {
      pending: "À recueillir",
      granted: "Accordé",
      refused: "Refusé",
    },
    explain: {
      pending:
        "Rien ne peut être déposé tant que le consentement n'est pas tranché.",
      granted:
        "Tous les participants ont accepté : l'enregistrement peut être déposé et transcrit.",
      refused:
        "Pas d'enregistrement, donc pas de transcription ni de compte rendu automatique.",
    },
    recorded: (date: string, who: string | null) =>
      who ? `Noté le ${date} par ${who}` : `Noté le ${date}`,
    notRecorded: "Pas encore noté.",
    note: "Précision (facultatif)",
    notePlaceholder: "Ex. accord oral donné en début de call",
    change: "Mettre à jour",
    pending: "Enregistrement…",
    locked:
      "Un enregistrement est déposé : le consentement ne peut plus être retiré depuis cet écran.",
    saved: "Consentement mis à jour.",
  },
  status: {
    draft: "Brouillon",
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
    blockedPending:
      "Le dépôt est bloqué tant que le consentement est « à recueillir ».",
    blockedRefused: "Consentement refusé : aucun enregistrement possible.",
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
    sent: "Enregistrement envoyé. Vous pouvez lancer la transcription.",
    freeTierNote:
      "Au-delà de 25 Mo (environ 1 h 45), la transcription exige le palier payant du fournisseur.",
    or: "ou déposer un fichier existant",
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
    title: "Transcription et compte rendu",
    run: "Transcrire et extraire",
    transcribing: "Transcription en cours…",
    extracting: "Extraction du compte rendu…",
    rerunExtraction: "Relancer l'extraction",
    retry: "Réessayer",
    hint: "Compter jusqu'à quelques minutes pour un call long. Gardez cette page ouverte.",
    done: "Compte rendu prêt.",
    busy: "Un traitement est déjà en cours pour ce call.",
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
    not_found: "Call introuvable ou inaccessible.",
    unauthorized: "Session expirée : reconnectez-vous.",
    forbidden:
      "Seul le chef de projet responsable peut modifier les calls de ce projet.",
    consent_locked:
      "Un enregistrement est déposé : le consentement ne peut plus être retiré.",
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
