const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/** Marketing › Production: the technical check, the delivery and the hand-off to Activations. */
export const productionDelivery = {
  title: "Livraison",
  readOnly:
    "Lecture seule : seul le responsable du projet contrôle les exports, livre et transmet, pendant la production.",
  locked: "La production n'est plus en cours : rien ne change ici.",
  close: "Fermer",
  cancel: "Annuler",
  saving: "Enregistrement…",
  decisions: {
    title: "Trois décisions distinctes",
    description:
      "Version validée, exports contrôlés, livré : chacune se prend à part, dans cet ordre.",
    states: {
      done: "Fait",
      to_do: "À faire",
      blocked: "Bloqué",
      waiting: "En attente",
    },
    creative: {
      title: "Validation créative",
      done: (n: number, who: string, date: string) =>
        `Version V${n} validée par ${who} le ${date}`,
      doneWithoutVersion: (who: string, date: string) =>
        `Version validée par ${who} le ${date}`,
      pending:
        "Aucune version finale validée : elle se soumet et se valide dans l'onglet Postproduction.",
      open: "Voir dans Postproduction",
      openVersion: "Ouvrir la version",
    },
    technical: {
      title: "Contrôle technique",
      done: (who: string, date: string) =>
        `Exports contrôlés par ${who} le ${date}`,
      ready:
        "Toutes les lignes de la checklist sont conformes : le contrôle peut être confirmé.",
    },
    delivery: {
      title: "Livraison",
      done: (who: string, date: string) => `Livré par ${who} le ${date}`,
      ready: "Le contrôle est confirmé : le livrable peut passer à Livré.",
      notPublished:
        "Livré ne veut pas dire publié : la diffusion se décide dans Activations.",
      final: "Lien des exports finaux",
      reopenHint:
        "Un fichier remplacé ou une non-conformité découverte : rouvrez la livraison, le contrôle est à refaire.",
    },
    reasons: {
      no_version: "La version finale n'est pas encore validée.",
      no_checklist: "La checklist des exports n'est pas créée.",
      to_check: (n: number) =>
        plural(
          n,
          "1 fichier attendu reste à contrôler.",
          `${n} fichiers attendus restent à contrôler.`,
        ),
      not_ok: (n: number) =>
        plural(
          n,
          "1 fichier est non conforme.",
          `${n} fichiers sont non conformes.`,
        ),
      stale: (n: number) =>
        plural(
          n,
          "1 ligne est à revérifier : la version ou le fichier final a changé après son contrôle.",
          `${n} lignes sont à revérifier : la version ou le fichier final a changé après leur contrôle.`,
        ),
      not_checked: "Le contrôle technique n'est pas confirmé.",
    },
    blockedTitle: "Pourquoi ce n'est pas encore possible",
  },
  checklist: {
    title: "Checklist des exports",
    description:
      "Une ligne par fichier attendu, contrôlée à part : seule une ligne cochée conforme vaut contrôle.",
    expected: {
      title: "Ce que la Fiche Livrable attend",
      duration: "Durée",
      formats: "Formats",
      subtitles: "Sous-titres",
      none: "Non renseigné",
      noSubtitles: "Aucun",
      subtitleModes: {
        burned: "intégrés à l'image",
        file: "en fichier séparé",
        both: "intégrés et en fichier",
      } as Record<string, string>,
      subtitlesOn: (mode: string | null, ratios: string[]) =>
        [
          mode ? `Oui, ${mode}` : "Oui",
          ratios.length > 0 ? `(${ratios.join(", ")})` : null,
        ]
          .filter(Boolean)
          .join(" "),
      durationRange: (min: string | null, max: string | null) =>
        min && max && min !== max
          ? `${min} à ${max}`
          : (min ?? max ?? "Non renseigné"),
    },
    points: {
      title: "Points à contrôler sur chaque fichier",
      items:
        "Présence, lisibilité, durée, ratio, cadrage, image, son, sous-titres, nommage, conformité au brief.",
      note: "Un rappel pour guider le contrôle, jamais une preuve : la conformité se coche ligne par ligne.",
    },
    labels: {
      export: (orientation: string | null, ratio: string) =>
        orientation ? `Export ${orientation} ${ratio}` : `Export ${ratio}`,
      orientations: {
        horizontal: "horizontal",
        vertical: "vertical",
        square: "carré",
      },
      subtitles: (mode: string | null) =>
        mode === "burned"
          ? "Sous-titres intégrés"
          : mode === "file"
            ? "Fichier de sous-titres"
            : mode === "both"
              ? "Sous-titres intégrés et fichier"
              : "Sous-titres",
      qc: "Contrôle qualité",
    },
    kinds: {
      export: "Export",
      subtitles: "Sous-titres",
      qc: "Contrôle qualité",
      other: "Autre",
    },
    states: {
      to_check: "À contrôler",
      ok: "Conforme",
      not_ok: "Non conforme",
      stale: "À revérifier",
    },
    checked: (result: string, who: string, date: string) =>
      `${result} · ${who}, le ${date}`,
    proposed: (n: number) =>
      plural(
        n,
        "D'après la Fiche Livrable, 1 fichier est attendu :",
        `D'après la Fiche Livrable, ${n} fichiers sont attendus :`,
      ),
    noFiche:
      "La Fiche Livrable ne précise pas les formats : ajoutez chaque fichier attendu.",
    empty: "Aucun fichier attendu pour l'instant.",
    create: "Créer la checklist",
    created: "Checklist créée.",
    add: "Ajouter un fichier attendu",
    openFile: "Ouvrir le fichier",
    noFile: "Lien du fichier à ajouter",
    markOk: "Conforme",
    markNotOk: "Non conforme",
    recheck: "Revérifier : conforme",
    marked: "Contrôle enregistré.",
    menu: (label: string) => `Actions pour « ${label} »`,
    edit: "Modifier",
    remove: "Retirer",
    form: {
      addTitle: "Ajouter un fichier attendu",
      editTitle: "Modifier le fichier attendu",
      description:
        "Un lien vers le fichier change ? Son contrôle est à refaire et la livraison se rouvre.",
      label: "Libellé",
      labelHint: "Par exemple : Export vertical 9:16.",
      kind: "Type",
      url: "Lien du fichier",
      urlHint: "Commence par https:// (Drive, Frame.io, WeTransfer…).",
      save: "Enregistrer",
      saved: "Fichier attendu enregistré.",
    },
    notOk: {
      title: (label: string) => `Non conforme · ${label}`,
      description:
        "Dites ce qui ne va pas : la livraison reste impossible tant que la ligne n'est pas conforme.",
      note: "Ce qui ne va pas",
      confirm: "Enregistrer",
    },
    removeDialog: {
      title: "Retirer ce fichier attendu ?",
      body: (label: string) =>
        `« ${label} » sort de la checklist, avec son contrôle.`,
      confirm: "Retirer",
      pending: "Retrait…",
      done: "Fichier attendu retiré.",
    },
  },
  handoff: {
    title: "Transmission à Activations",
    description:
      "Une référence aux fichiers livrés, jamais une copie : rien n'est publié.",
    notDelivered:
      "La transmission s'ouvre une fois le livrable livré : la version, les formats et la date partent alors vers Activations.",
    upToDate: "La dernière transmission correspond à la livraison actuelle.",
    open: "Transmettre à Activations",
    again: "Transmettre la nouvelle livraison",
    dialogTitle: "Transmettre à Activations",
    dialogDescription:
      "Préparé d'après la livraison et la Fiche Livrable : vérifiez, puis confirmez. Rien n'est publié.",
    version: "Version livrée",
    versionValue: (n: number) => `V${n}`,
    finalLink: "Lien des exports",
    deliveredOn: "Livré le",
    status: "Statut",
    statusValue: "Livré, pas publié",
    formats: "Formats",
    noFormats: "Aucun format connu : la Fiche ne précise pas de ratio.",
    constraints: "Droits et contraintes connus",
    constraintsHint:
      "Pré-rempli avec les contraintes de la Fiche Livrable, à compléter.",
    confirm: "Confirmer la transmission",
    done: "Transmis à Activations.",
    none: "Aucune transmission pour l'instant.",
    by: (who: string, date: string) => `Transmis par ${who} le ${date}`,
    summary: (version: string | null, delivered: string) =>
      [version, `livré le ${delivered}`].filter(Boolean).join(" · "),
    states: {
      current: "À jour",
      stale: "À revoir",
      earlier: "Remplacée",
    },
    stale: {
      reopened: "La livraison a été rouverte depuis cette transmission.",
      version: "La version livrée a changé depuis cette transmission.",
      file: "Le fichier livré a changé depuis cette transmission.",
      redelivered: "Le livrable a été relivré depuis cette transmission.",
      warning: "Une activation peut pointer vers une version antérieure.",
    },
  },
  activations: {
    title: "Livrables transmis par la Production",
    description:
      "Les versions livrées, référencées par la Production. Livré ne veut pas dire publié.",
  },
  errors: {
    approveOnVersion:
      "Ce livrable a une préparation de production : la version finale se valide dans l'onglet Postproduction.",
    exportsNotChecked:
      "Le contrôle ne peut pas être confirmé : chaque fichier attendu de la checklist doit être coché conforme.",
    notDelivered:
      "Le livrable n'est pas livré : la transmission à Activations attend la livraison.",
    noteRequired: "Dites ce qui ne va pas avant d'enregistrer.",
    label: "Donnez un libellé au fichier attendu.",
    url: "Le lien doit commencer par https://",
    nothingToCreate: "La Fiche Livrable n'attend aucun fichier de plus.",
  },
} as const;
