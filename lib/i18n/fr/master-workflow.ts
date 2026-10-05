// Master workflow of a project (lib/master-workflow/).
const titles = (count: number) => (count > 1 ? `${count} titres` : "1 titre");

export const masterWorkflow = {
  steps: {
    label: "Étapes du master",
    soon: "Bientôt disponible",
    state: "État du master",
    brief: "Brief Mix/Master",
    mix: "Mix",
    mastering: "Mastering",
    final: "Master final",
  },
  brief: {
    title: "Brief Mix/Master",
    description:
      "Ce que l'ingénieur du mix et celui du mastering doivent savoir : la source, qui fait quoi, la direction, les livrables et le calendrier. Rempli par le chef de projet.",
    saved: (date: string, by: string | null) =>
      by ? `Enregistré le ${date} par ${by}` : `Enregistré le ${date}`,
    notSaved:
      "Pas encore enregistré : ce qui est déjà connu du projet est pré-rempli.",
    submit: "Enregistrer le Brief",
    submitting: "Enregistrement…",
    savedToast: "Brief enregistré.",
    none: "Pas encore choisi",
    sections: {
      sources: {
        title: "Source",
        description: "La version de chaque titre, sa session et ses pistes.",
      },
      mix: {
        title: "Mix",
      },
      mastering: {
        title: "Mastering",
      },
      direction: {
        title: "Direction artistique",
      },
      deliverables: {
        title: "Livrables",
      },
      calendar: {
        title: "Calendrier",
      },
      budget: {
        title: "Budget estimé",
      },
    },
    fields: {
      mixEngineer: "Ingénieur du mix",
      masteringEngineer: "Ingénieur du mastering",
      engineerHint: "Les ingénieurs du Réseau.",
      sameEngineer: "Même ingénieur que le mix",
      mixRate: "Tarif estimé du mix",
      masteringRate: "Tarif estimé du mastering",
      rateHint: "Facultatif, en euros.",
      revisions: "Révisions incluses",
      revisionsHint: "Le nombre d'allers-retours prévus avec l'ingénieur.",
      validator: "Qui valide les versions",
      validatorHint: "Le chef de projet ou un directeur créatif du projet.",
      references: "Références",
      referencesHint:
        "Des titres dont s'inspirer, avec ce qu'il faut y entendre.",
      direction: "Direction",
      constraints: "Contraintes",
      deliverables: "Livrables",
      mixV1Due: "Mix V1",
      mixFinalDue: "Mix final",
      masteringDue: "Mastering",
      masterFinalDue: "Master final",
      masterFinalHint: "La date dont tout le reste dépend.",
    },
    deliverables: {
      mix_final: "Mix final",
      master_final: "Master final",
      instrumental: "Instrumental",
      acapella: "A cappella",
      clean: "Version clean",
      radio_edit: "Radio edit",
      live: "Version live / performance",
      tv_mix: "TV mix / backing track",
      stems: "Stems",
    },
    proposal: (dates: string) => `Proposition : ${dates}.`,
    applyProposal: "Utiliser ces dates",
    noProposal:
      "Indiquez la date du master final pour obtenir une proposition.",
    total: (amount: string) => `Total estimé : ${amount}`,
    noRate: "Aucun tarif indiqué.",
    engineerContact: {
      noHistory: "Jamais crédité sur un titre de PDS",
    },
    errors: {
      forbidden: "Seul le chef de projet responsable remplit le Brief.",
      amount: "Un montant en euros, par exemple 800 ou 1 200,50.",
      revisions: "Un nombre entre 0 et 20.",
      date: "Une date valide.",
      calendar:
        "Les dates doivent se suivre : Mix V1, Mix final, Mastering, puis Master final.",
      validator:
        "Le validateur doit être le chef de projet ou un directeur créatif du projet.",
      tooLong: "2 000 caractères au plus.",
      failed: "Le Brief n'a pas pu être enregistré. Réessayez.",
    },
  },
  inventory: {
    title: "État du master",
    description:
      "Ce que les titres du projet ont déjà pour le mix et le mastering : la source, les pistes, les ingénieurs. Chaque information est connue, à confirmer ou manquante.",
    noTitles:
      "Aucun titre n'est rattaché à ce projet : le master se suit titre par titre.",
    noneOfState: {
      known: "Aucune information connue pour l'instant.",
      to_confirm: "Aucune information à confirmer.",
      missing: "Aucune information manquante.",
    },
    counts: {
      known: "Informations connues",
      to_confirm: "Informations à confirmer",
      missing: "Informations manquantes",
    },
    sections: {
      sources: {
        title: "Source",
        description:
          "La version audio que le mix utilisera, confirmée par le chef de projet, et la session dont elle vient.",
      },
      materials: {
        title: "Pistes et fichiers",
        description: "Ce que l'ingénieur du mix reçoit pour travailler.",
      },
      engineers: {
        title: "Mix et mastering",
        description:
          "Qui mixe et qui masterise chaque titre, et s'ils sont dans le Réseau.",
      },
    },
    facts: {
      source: "Source du mix",
      session: "Session d'enregistrement",
      stems: "Pistes séparées (stems)",
    },
    states: {
      noAudio: "Aucun fichier audio",
      sourceToConfirm: "Source à confirmer",
      sourceConfirmed: "Source confirmée",
      newerVersion: "Version plus récente reçue",
      finalMaster: "Master final reçu",
      sessionKnown: "Renseignée",
      noSession: "Aucune session",
      stemsKnown: "Disponibles",
      noStems: "Aucun fichier de pistes",
      namedInSession: "Nommé dans une session",
      nobody: "Personne n'est crédité",
    },
    sources: {
      audio: "Audio du titre",
      sessions: "Sessions du titre",
      files: "Fichiers du titre",
      credits: "Crédits du titre",
    },
    version: (version: number) => `v${version}`,
    source: {
      addedOn: (date: string) => `Ajoutée le ${date}`,
      current: "Source actuelle",
      detected: "Dernière version détectée",
      confirmed: (date: string, by: string | null) =>
        by ? `confirmée le ${date} par ${by}` : `confirmée le ${date}`,
      newer: (fileName: string) => `nouvelle version : ${fileName}`,
      confirm: "Confirmer",
      change: "Changer",
      dialogTitle: (title: string) => `Source du mix · ${title}`,
      dialogDescription:
        "La version que l'ingénieur du mix recevra. La dernière version détectée est proposée ; vous pouvez en choisir une autre.",
      legend: "Version audio",
      submit: "Utiliser cette version",
      submitting: "Enregistrement…",
      cancel: "Annuler",
      errors: {
        forbidden: "Seul le chef de projet responsable confirme la source.",
        notASource:
          "Cette version n'est plus une version audio de ce titre. Rechargez la page.",
        failed: "La source n'a pas pu être enregistrée. Réessayez.",
      },
    },
    fileCount: (count: number) =>
      count > 1 ? `${count} fichiers` : "1 fichier",
    engineersInNetwork: (count: number) =>
      count > 1
        ? `${count} ingénieurs dans le Réseau`
        : "1 ingénieur dans le Réseau",
    actions: {
      addAudio: "Ajouter l'audio",
      addStems: "Ajouter les pistes",
      addSession: "Ajouter une session",
      credit: "Créditer",
      creditTitle: "Créditer un ingénieur",
    },
    network: {
      title: "Ingénieurs du Réseau",
      description:
        "Les contacts au rôle d'ingénieur, et les titres de PDS qu'ils ont déjà mixés ou masterisés.",
      empty: "Aucun ingénieur dans le Réseau.",
      add: "Ajouter un ingénieur",
      columns: {
        name: "Nom",
        city: "Ville",
        history: "Déjà fait avec PDS",
        contact: "Coordonnées",
      },
      noHistory: "Aucun titre",
      mixHistory: (count: number) => `Mix sur ${titles(count)}`,
      masteringHistory: (count: number) => `Mastering sur ${titles(count)}`,
    },
  },
} as const;
