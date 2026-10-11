/** Conception, étape 6: moodboards and references, one resource for many deliverables. */
export const conceptionRefs = {
  title: "Références",
  description:
    "Moodboards, images, PDF, vidéos ou liens. Une référence sert à un ou plusieurs livrables ; elle reste une proposition tant que la direction artistique ne l'a pas validée.",
  readOnly:
    "Le chef de projet, l'équipe créative et les responsables désignés déposent les références pendant la conception.",

  unattached: "À rattacher",
  unattachedHint: "Déposées sans livrable : choisissez à quoi elles servent.",
  direction: "Direction créative",
  directionHint: "Ce que tous les livrables partagent.",
  empty: "Aucune référence pour l'instant.",
  emptyTarget: "Aucune référence rattachée.",
  alsoFor: (targets: string) => `Sert aussi à : ${targets}`,

  statuses: {
    proposed: "Proposée",
    validated: "Validée",
  },
  kinds: {
    image: "Image",
    pdf: "PDF",
    video: "Vidéo",
    other: "Fichier",
    link: "Lien",
  },
  open: "Ouvrir",
  openLabel: (name: string) => `Ouvrir ${name} dans un nouvel onglet`,
  unavailable: "Fichier indisponible",

  add: {
    open: "Déposer des références",
    title: "Déposer des références",
    description:
      "Un moodboard complet, plusieurs références séparées, ou un lien. Une même référence n'est jamais stockée deux fois : elle est rattachée à plusieurs livrables.",
    file: "Fichiers",
    link: "Lien",
    kindLabel: "Type de référence",
    dropLabel: "Glissez des fichiers ici, ou cliquez pour les choisir",
    dropHint: "Images, PDF ou vidéos, 50 Mo au plus chacun.",
    chosen: (n: number) =>
      n === 1 ? "1 fichier choisi" : `${n} fichiers choisis`,
    removeFile: (name: string) => `Retirer ${name}`,
    urlLabel: "Lien",
    urlPlaceholder: "https://…",
    urlHint: "Une vidéo, une image, un moodboard en ligne.",
    titleLabel: "Titre",
    titlePlaceholder: "Ex. Lumière rasante, profil",
    noteLabel: "Note",
    notePlaceholder: "Ce qu'on en retient : la lumière, le cadrage, le rythme.",
    targetsLegend: "Sert à",
    targetsHint: "Aucun choix : la référence reste « À rattacher ».",
    submit: "Déposer",
    submitting: "Dépôt…",
    cancel: "Annuler",
    close: "Fermer",
    added: (n: number) =>
      n === 1 ? "Référence déposée" : `${n} références déposées`,
    deduped: (name: string) =>
      `« ${name} » était déjà déposée : rattachée en plus aux livrables choisis.`,
    tooLarge: (name: string) => `« ${name} » dépasse 50 Mo.`,
    wrongType: (name: string) =>
      `« ${name} » n'est ni une image, ni un PDF, ni une vidéo.`,
    nothing: "Choisissez au moins un fichier, ou collez un lien.",
  },

  similar: {
    open: "Chercher des références semblables",
    title: "Références semblables",
    description: (sources: string) =>
      `PO regarde votre moodboard et cherche des images de la même famille sur ${sources}. Rien n'est ajouté sans votre choix.`,
    and: (labels: string[]) =>
      labels.length > 1
        ? `${labels.slice(0, -1).join(", ")} et ${labels[labels.length - 1]}`
        : (labels[0] ?? ""),
    notConfigured:
      "Aucune source d'images n'est branchée : il manque la clé Unsplash (UNSPLASH_ACCESS_KEY) et la clé Tumblr (TUMBLR_API_KEY) de l'application.",
    noImage:
      "Aucune image lisible par PO dans le moodboard (JPEG, PNG, WebP ou GIF, 5 Mo au plus) : déposez-en une d'abord.",
    close: "Fermer",
    baseLegend: "À partir de",
    allImages: "Toutes les images",
    baseCount: (label: string, n: number) =>
      `${label} · ${n === 1 ? "1 image" : `${n} images`}`,
    rebound:
      "Are.na ne se cherche par mots qu'avec un compte Premium : la recherche part des chaînes où sont rangées les images Are.na de ce moodboard, et du lien collé.",
    linkLabel: "Lien Are.na",
    linkPlaceholder: "https://www.are.na/…",
    linkHint:
      "Une image ou une chaîne Are.na qui a la bonne ambiance : ses chaînes voisines sont explorées.",
    search: "Chercher des images",
    stepsLabel: "Recherche en cours",
    stepDone: "terminé",
    stepRead: "PO regarde les images",
    stepSearch: (sources: string) => `Recherche sur ${sources}`,
    lookLabel: "Ce que PO voit",
    groupsLegend: "D'où viennent les images",
    groupsHint: "Décochez une pastille pour masquer ses images.",
    group: (source: string, label: string, n: number) =>
      `${source} · ${label} · ${n}`,
    sources: {
      unsplash: "Unsplash",
      tumblr: "Tumblr",
      arena: "Are.na",
      openverse: "Openverse",
    },
    resultsLabel: "Images trouvées",
    nothing: "Rien de nouveau trouvé à partir de ces images.",
    nothingShown: "Toutes les pastilles sont décochées.",
    pick: (title: string) => `Garder ${title}`,
    untitled: "Image sans titre",
    onSource: (source: string) => `Voir sur ${source}`,
    credit: (author: string | null, license: string | null) =>
      [author, license].filter(Boolean).join(" · "),
    targetsLegend: "Sert à",
    targetsHint: "Aucun choix : les images restent « À rattacher ».",
    again: "Nouvelle recherche",
    submit: (n: number) =>
      n === 0 ? "Ajouter" : n === 1 ? "Ajouter 1 image" : `Ajouter ${n} images`,
    adding: (done: number, total: number) => `Ajout ${done} sur ${total}…`,
    pickFirst: "Cochez au moins une image à garder.",
    added: (n: number) =>
      n === 1
        ? "1 image ajoutée au moodboard"
        : `${n} images ajoutées au moodboard`,
    deduped: "Une image était déjà dans le projet : rattachée en plus.",
    noSource:
      "Rien pour partir : déposez d'abord une image dans ce moodboard (JPEG, PNG, WebP ou GIF, 5 Mo au plus).",
    // Kept in the reference's note: credits the image, and its address is
    // how a later search leaves it out (and where Are.na rebounds from).
    note: (
      source: string,
      image: { pageUrl: string; author: string | null; license: string | null },
    ) => {
      const credit = [image.author, image.license].filter(Boolean).join(", ");
      return `Trouvée sur ${source}${credit ? ` (${credit})` : ""} : ${image.pageUrl}`.slice(
        0,
        500,
      );
    },
    errors: {
      badLink:
        "Ce lien n'est pas une adresse Are.na d'image (are.na/block/…) ou de chaîne (are.na/<compte>/<chaîne>).",
      someSource: "La source",
      unauthorized: (source: string) =>
        `${source} refuse la clé de l'application : il faut la vérifier.`,
      premium:
        "La recherche par mots d'Are.na est réservée aux comptes Premium : le jeton de l'application vient d'un compte gratuit.",
      rateLimited: (source: string) =>
        source === "Unsplash"
          ? "Unsplash limite les recherches (50 par heure tant que l'application n'est pas validée par Unsplash). Réessayez plus tard."
          : `${source} limite les recherches pour l'instant. Réessayez dans une minute.`,
      unreachable: (source: string) => `${source} n'a pas répondu. Réessayez.`,
      tooLarge:
        "Cette image est trop lourde pour le moodboard (15 Mo au plus).",
      generic: "La recherche n'a pas abouti. Réessayez.",
      gone: "Cette image n'est plus disponible à sa source.",
      notImage: "Ce fichier n'est pas une image que le moodboard accepte.",
    },
  },

  actions: {
    label: (name: string) => `Actions sur ${name}`,
    attach: "Rattacher",
    edit: "Modifier",
    remove: "Retirer",
  },
  attach: {
    title: "Rattacher la référence",
    description:
      "Choisissez les livrables qu'elle sert. La même ressource est partagée, jamais recopiée.",
    submit: "Enregistrer",
    submitting: "Enregistrement…",
    saved: "Rattachements enregistrés",
  },
  edit: {
    title: "Modifier la référence",
    description: "Son titre et ce qu'on en retient.",
    submit: "Enregistrer",
    submitting: "Enregistrement…",
    saved: "Référence modifiée",
  },
  remove: {
    title: "Retirer cette référence ?",
    body: "Elle disparaît de tous les livrables qu'elle sert. Une version déjà soumise la garde dans son historique.",
    confirm: "Retirer la référence",
    pending: "Retrait…",
    done: "Référence retirée",
  },

  errors: {
    upload: "Le fichier n'a pas pu être envoyé. Réessayez.",
    invalid: "Vérifiez la référence : lien https, titre et note courts.",
  },
};
