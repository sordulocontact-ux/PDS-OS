/** Release, detection status and public smartlink (step 6). */
export const release = {
  // Distribution in two steps (lib/ui/distribution-steps.ts, ticket
  // « Architecture globale »): what leaves, then what is online.
  page: {
    title: "Préparation",
    description:
      "Ce que le dépôt réutilise, vérifié dans chaque module source, puis les identifiants et la date de la sortie.",
  },
  online: {
    title: "Plateformes",
    description:
      "La disponibilité publique et chaque plateforme, vérifiées par une personne ; puis la détection automatique (simple suggestion) et le smartlink public.",
    empty:
      "Enregistre d'abord la sortie dans la Préparation : la détection part de son ISRC.",
    toPrepare: "Aller à la Préparation",
  },
  form: {
    titleCreate: "Déclarer la sortie",
    titleEdit: "Informations de la sortie",
    hint: "L'ISRC déclenche la détection automatique, chaque matin et à la demande.",
    fields: {
      title: "Titre",
      isrc: "ISRC",
      isrcHint: "12 caractères, ex. FRZ032600001. Espaces et tirets acceptés.",
      upc: "UPC",
      upcHint: "Code-barres de 12 ou 13 chiffres.",
      plannedReleaseDate: "Date de sortie prévue",
      spotifyUrl: "Lien Spotify",
      spotifyUrlHint:
        "Utilisé tant que la détection ne trouve pas Spotify. Commence par https://open.spotify.com/",
    },
    submitCreate: "Créer la sortie",
    submitEdit: "Enregistrer",
    pending: "Enregistrement…",
    saved: "Sortie enregistrée.",
    errors: {
      title: "Le titre est obligatoire.",
      isrc: "ISRC invalide : 2 lettres, 3 caractères, 7 chiffres.",
      upc: "UPC invalide : 12 ou 13 chiffres.",
      plannedReleaseDate: "Date invalide.",
      spotifyUrl: "Le lien doit commencer par https://open.spotify.com/",
      isrcTaken: "Cet ISRC est déjà utilisé par une autre sortie.",
      generic: "L'enregistrement a échoué. Réessayez.",
    },
  },
  detection: {
    title: "Détection",
    hint: "Deezer, iTunes et MusicBrainz, interrogés par ISRC. Aucune IA : que du code.",
    online: "En ligne",
    offline: "Pas encore détectée",
    onlineSince: "En ligne depuis le",
    lastCheck: "Dernière vérification",
    never: "jamais",
    platformCount: (count: number) =>
      `${count} plateforme${count > 1 ? "s" : ""}`,
    links: "Liens",
    noLinks: "Aucun lien pour l'instant.",
    needsIsrc: "Renseignez l'ISRC pour lancer la détection.",
    check: "Vérifier maintenant",
    checking: "Vérification…",
    checked: (count: number) =>
      count > 0
        ? `Vérification terminée · ${count} lien${count > 1 ? "s" : ""}.`
        : "Vérification terminée · aucun lien trouvé.",
    errors: {
      no_isrc: "Renseignez l'ISRC avant de vérifier.",
      not_found: "Sortie introuvable.",
      detection_failed:
        "Aucune source n'a répondu. Réessayez dans quelques minutes.",
      generic: "La vérification a échoué. Réessayez.",
    } as Record<string, string>,
    via: "via",
    firstSeen: "vu le",
    sources: {
      deezer: "Deezer",
      itunes: "iTunes",
      musicbrainz: "MusicBrainz",
      odesli: "Odesli",
      manual: "saisie manuelle",
    },
  },
  smartlink: {
    title: "Smartlink",
    hint: "Page publique qui regroupe les liens d'écoute. Sans compte, sans suivi.",
    enabled: "Activé",
    disabled: "Désactivé",
    enable: "Activer le smartlink",
    disable: "Désactiver",
    pending: "…",
    offHint: "Tant qu'il est désactivé, le lien renvoie une page introuvable.",
    urlLabel: "Adresse publique",
    copy: "Copier",
    copied: "Lien copié.",
    copyFailed: "Copie impossible : sélectionnez le lien à la main.",
    open: "Ouvrir",
    error: "La modification a échoué. Réessayez.",
  },
  public: {
    listen: "Écouter sur",
    empty: "Les liens d'écoute arrivent bientôt.",
    by: "par",
  },
  platforms: {
    spotify: "Spotify",
    appleMusic: "Apple Music",
    deezer: "Deezer",
    youtubeMusic: "YouTube Music",
    youtube: "YouTube",
    tidal: "Tidal",
    amazonMusic: "Amazon Music",
    soundcloud: "SoundCloud",
  },
  states: {
    loading: "Chargement de la sortie…",
    error: "Impossible de charger la sortie.",
    retry: "Réessayer",
    projectNotFound: "Projet introuvable.",
  },
} as const;
