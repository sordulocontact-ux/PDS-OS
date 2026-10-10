/** Marketing › Production: the director's brief (parcours 2). */
export const productionBrief = {
  title: "Brief réalisateur",
  description:
    "L'approche de réalisation, en complément de la direction créative validée.",
  notFilled: "Non renseigné",
  updated: (who: string | null, date: string) =>
    who ? `Mis à jour par ${who} le ${date}` : `Mis à jour le ${date}`,
  fill: "Compléter le brief",
  edit: "Modifier",
  close: "Fermer",
  cancel: "Annuler",
  save: "Enregistrer le brief",
  saving: "Enregistrement…",
  director: {
    label: "Réalisateur",
    member: "membre",
    network: "Réseau",
    none: "Le chef de projet désigne le réalisateur.",
    designate: "Désigner",
    change: "Changer",
    dialogTitle: "Désigner le réalisateur",
    dialogDescription:
      "Un membre désigné peut compléter le brief lui-même ; un contact du Réseau est seulement nommé.",
    field: "Réalisateur",
    placeholder: "Choisir une personne",
    noneOption: "Aucun",
    members: "Membres",
    contacts: "Réseau",
    videographer: "vidéaste",
    save: "Enregistrer",
  },
  dialog: {
    title: "Brief réalisateur",
    description:
      "Ce que la Conception a décidé ne se redemande pas : décrivez seulement l'approche de réalisation.",
  },
  topics: {
    stagingIntent: "Intention de mise en scène",
    coverage: "Découpage",
    camera: "Dispositif caméra",
    sound: "Traitement du son",
    runOfShow: "Déroulé",
    constraintsNote: "Contraintes",
    referencesNote: "Références",
    openNeeds: "Besoins à confirmer",
  },
  choiceLegends: {
    coverage: "Découpage",
    cameraSetup: "Dispositif caméra",
    soundCapture: "Traitement du son",
  },
  deselect: "Un second clic retire le choix.",
  choices: {
    coverage: {
      one_take: {
        label: "Plan-séquence",
        description: "Une seule prise continue, sans coupe.",
      },
      cut: {
        label: "Découpage",
        description: "Plusieurs plans montés ensemble.",
      },
      mixed: {
        label: "Mixte",
        description: "Des plans-séquences et des plans découpés.",
      },
    },
    cameraSetup: {
      single: {
        label: "Une caméra",
        description: "Un seul point de vue à la fois.",
      },
      multi: {
        label: "Plusieurs caméras",
        description: "Plusieurs points de vue tournés en même temps.",
      },
    },
    soundCapture: {
      playback: {
        label: "Playback",
        description:
          "Le titre est diffusé sur le tournage, l'artiste joue dessus.",
      },
      live: {
        label: "Captation live",
        description: "Voix et instruments enregistrés pendant la prise.",
      },
      mixed: {
        label: "Mixte",
        description: "Une partie en playback, une partie captée en live.",
      },
    },
  },
  fields: {
    stagingIntent: {
      label: "Intention de mise en scène",
      hint: "Ce que la réalisation cherche à faire ressentir, et comment.",
    },
    coverageNote: {
      label: "Précision sur le découpage",
      hint: "Nombre de plans, moments clés, mouvements.",
    },
    cameraNote: {
      label: "Précision sur le dispositif",
      hint: "Placement, optiques, stabilisation.",
    },
    soundNote: {
      label: "Précision sur le son",
      hint: "Ce qui est capté, et par qui.",
    },
    runOfShow: {
      label: "Déroulé",
      hint: "Les étapes de la journée de tournage, dans l'ordre.",
    },
    constraintsNote: {
      label: "Contraintes",
      hint: "Lieu, horaires, autorisations, matériel.",
    },
    referencesNote: {
      label: "Références",
      hint: "Ce qui inspire la réalisation, en plus des références de la Conception.",
    },
    openNeeds: {
      label: "Besoins à confirmer",
      hint: "Ce qui reste à trouver ou à vérifier avant le tournage.",
    },
  },
  errors: {
    tooLong: "Un texte du brief est trop long.",
  },
} as const;
