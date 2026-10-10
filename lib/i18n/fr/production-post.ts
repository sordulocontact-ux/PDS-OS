/** Marketing › Production: postproduction (references, steps, versions, feedback, final validation). */
export const productionPost = {
  title: "Postproduction",
  locked:
    "La production n'est plus en cours : la postproduction est en lecture.",
  readOnly:
    "Le responsable du projet organise la postproduction ; le responsable et l'équipe créative relisent les versions.",
  close: "Fermer",
  cancel: "Annuler",
  saving: "Enregistrement…",
  save: "Enregistrer",
  edit: "Modifier",
  remove: "Supprimer",
  removing: "Suppression…",

  shoot: {
    title: "Le compte rendu de tournage signale des manques",
    video: "Rushes vidéo non déclarés reçus",
    audio: "Sources audio non déclarées reçues",
    backup: "Sauvegarde non vérifiée",
    missingSequences: (text: string) => `Séquences manquantes : ${text}`,
    incident: (title: string) =>
      `Incident qui bloque la postproduction : ${title}`,
  },

  references: {
    title: "Références de postproduction",
    description:
      "Celles du Brief créatif restent à leur place, lues ici sans être recopiées.",
    fromFiche: "Du Brief créatif",
    own: "Ajoutées en postproduction",
    noneFromFiche: "Aucune référence dans la Fiche Livrable.",
    none: "Aucune référence ajoutée à cette étape.",
    add: "Ajouter une référence",
    addTitle: "Ajouter une référence",
    addDescription: "Vidéo, image, capture, lien ou note de montage.",
    kindLegend: "Type",
    kinds: {
      link: { label: "Lien", hint: "Une vidéo ou une image en ligne." },
      file: { label: "Fichier", hint: "Une capture, une image, un extrait." },
      note: { label: "Note de montage", hint: "Une consigne écrite." },
    },
    titleLabel: "Titre",
    url: "Lien",
    urlHint: "Adresse complète, en https://",
    note: "Note",
    noteRequired: "Note de montage",
    file: "Déposer un fichier",
    fileHint: "Ou cliquez pour le choisir.",
    fileChosen: (name: string) => `Fichier choisi : ${name}`,
    missing: {
      url: "Collez le lien de la référence, en https://.",
      file: "Choisissez le fichier à déposer.",
      note: "Écrivez la note de montage.",
    },
    done: "Référence ajoutée.",
    menu: (label: string) => `Actions pour « ${label} »`,
    removeTitle: "Supprimer la référence ?",
    removeBody: (label: string) =>
      `« ${label} » sera retirée des références de postproduction.`,
    removed: "Référence supprimée.",
    untitled: "Référence",
  },

  steps: {
    title: "Étapes de postproduction",
    description:
      "Plusieurs spécialistes ou un prestataire unique : vous confirmez la personne, les responsabilités, les dates et les accès.",
    none: "Aucune étape organisée pour l'instant.",
    add: "Ajouter une étape",
    addTitle: "Ajouter une étape",
    editTitle: (label: string) => `Modifier « ${label} »`,
    formDescription:
      "Rien n'est affecté par défaut : choisissez qui s'en charge quand c'est confirmé.",
    suggestionsTitle: "Étapes proposées par PO",
    suggestionsHint:
      "Modulables : ajoutez celles qui servent, rien n'est créé sans vous.",
    addSuggestion: (label: string) => `Ajouter « ${label} »`,
    addShort: "Ajouter",
    because: {
      always: "Étape habituelle d'un montage.",
      liveSound: "Le brief réalisateur prévoit un son capté en direct.",
      subtitles: "La Fiche Livrable demande des sous-titres.",
    },
    keys: {
      files_prep: "Préparation des fichiers",
      edit: "Montage vidéo",
      live_mix: "Mixage de la captation live",
      grading: "Étalonnage",
      subtitles: "Sous-titrage",
      exports_qc: "Exports et contrôle qualité",
      other: "Autre étape",
    },
    statuses: { todo: "À faire", in_progress: "En cours", done: "Fait" },
    key: "Étape",
    label: "Nom de l'étape",
    holder: "Qui s'en charge",
    holderNone: "À confirmer",
    members: "Membres de PDS",
    network: "Réseau",
    responsibilities: "Responsabilités",
    access: "Accès",
    accessPlaceholder: "Dossier partagé, identifiants transmis…",
    startsOn: "Début",
    endsOn: "Fin",
    status: "Avancement",
    period: (from: string, to: string) => `Du ${from} au ${to}`,
    from: (date: string) => `À partir du ${date}`,
    until: (date: string) => `Jusqu'au ${date}`,
    toConfirm: "Personne à confirmer",
    missing: {
      label: "Nommez l'étape.",
      dates: "La fin ne peut pas précéder le début.",
    },
    done: "Étape enregistrée.",
    menu: (label: string) => `Actions pour « ${label} »`,
    removeTitle: "Supprimer l'étape ?",
    removeBody: (label: string) =>
      `« ${label} » sera retirée de l'organisation de la postproduction.`,
    removed: "Étape supprimée.",
  },

  versions: {
    title: "Versions",
    description:
      "V1, V2, V3 et suivantes, sans limite : une nouvelle version ne remplace ni les précédentes, ni leurs retours, ni leurs décisions.",
    none: "Aucune version déposée.",
    add: "Déposer une version",
    addTitle: "Déposer une version",
    editTitle: (name: string) => `Modifier ${name}`,
    formDescription:
      "Le prestataire n'a pas de compte : vous déposez pour lui, il reste l'auteur de la version.",
    name: (n: number) => `V${n}`,
    named: (n: number, label: string) => `V${n} · ${label}`,
    label: "Numéro ou libellé",
    labelPlaceholder: "Montage final, version courte…",
    author: "Auteur",
    authorNone: "Non renseigné",
    mediaLegend: "Fichier ou lien",
    media: {
      file: { label: "Fichier", hint: "Un export de relecture." },
      link: { label: "Lien", hint: "Frame.io, Drive, Vimeo…" },
    },
    keepFile: (name: string) => `Fichier actuel : ${name}`,
    file: "Déposer le fichier de la version",
    fileHint: "Ou cliquez pour le choisir.",
    url: "Lien de la version",
    notes: "Notes",
    notesPlaceholder: "Ce qui a changé, ce qu'il faut regarder…",
    saveDraft: "Enregistrer en brouillon",
    submitReview: "Soumettre pour retours",
    submitFinal: "Soumettre à validation finale",
    noMediaStaysDraft:
      "Version enregistrée en brouillon : ajoutez un fichier ou un lien pour la soumettre.",
    saved: "Version enregistrée.",
    submittedReview: "Version soumise pour retours.",
    submittedFinal: "Version soumise à validation finale.",
    statuses: {
      draft: "Brouillon",
      in_review: "En revue",
      changes_requested: "Corrections demandées",
      final_review: "En validation finale",
      approved: "Validée",
      refused: "Refusée",
    },
    openLink: "Ouvrir le lien",
    noMedia: "Ni fichier ni lien : la version reste en brouillon.",
    createdBy: (who: string, date: string) => `Déposée par ${who} le ${date}`,
    authorLine: (who: string) => `Auteur : ${who}`,
    submittedOn: (who: string, date: string) => `Soumise par ${who} le ${date}`,
    decided: {
      changes_requested: (who: string, date: string) =>
        `Corrections demandées par ${who} le ${date}`,
      approved: (who: string, date: string) => `Validée par ${who} le ${date}`,
      refused: (who: string, date: string) => `Refusée par ${who} le ${date}`,
    },
    menu: (name: string) => `Actions pour ${name}`,
    removeTitle: "Supprimer le brouillon ?",
    removeBody: (name: string) =>
      `${name} n'a jamais été soumise : elle sera supprimée.`,
    removed: "Brouillon supprimé.",
    requestChanges: "Demander des corrections",
    requestChangesTitle: (name: string) =>
      `Demander des corrections sur ${name}`,
    requestChangesDescription:
      "La version passe en « Corrections demandées » ; les retours ouverts restent à transmettre.",
    requestChangesNote: "Message au prestataire",
    requestChangesDone: "Corrections demandées.",
    submitConfirmTitle: (name: string) => `Soumettre ${name} pour retours ?`,
    submitConfirmBody:
      "La version ne sera plus modifiable : les relecteurs pourront la commenter.",
    finalConfirmTitle: (name: string) =>
      `Soumettre ${name} à validation finale ?`,
    finalConfirmBody:
      "Le validateur choisira : Valider, Demander des corrections ou Refuser.",
  },

  comments: {
    title: "Retours",
    none: "Aucun retour sur cette version.",
    add: "Ajouter un retour",
    addTitle: (name: string) => `Retour sur ${name}`,
    addDescription:
      "Sans timecode, le retour est un commentaire général sur la version.",
    timecode: "Timecode",
    timecodeHint: "mm:ss ou hh:mm:ss",
    timecodeInvalid: "Écrivez le timecode en mm:ss ou hh:mm:ss (ex. 01:24).",
    general: "Général",
    category: "Catégorie",
    categories: {
      edit: "Montage",
      audio: "Audio",
      grading: "Étalonnage",
      subtitles: "Sous-titres",
      other: "Autre",
    },
    body: "Commentaire",
    bodyMissing: "Écrivez le retour.",
    attachment: "Joindre une pièce",
    attachmentHint: "Une capture, un extrait.",
    attachmentOpen: "Pièce jointe",
    done: "Retour ajouté.",
    statuses: {
      open: "Ouvert",
      acknowledged: "Pris en compte",
      declared_fixed: "Corrigé déclaré",
      to_verify: "À vérifier",
      resolved: "Résolu",
      rejected: "Rejeté",
    },
    moves: {
      open: "Rouvrir",
      acknowledged: "Pris en compte",
      declared_fixed: "Corrigé déclaré par le prestataire",
      to_verify: "Passer à vérifier",
      resolved: "Vérifié : résolu",
      rejected: "Rejeter",
    },
    statusDone: "Statut du retour mis à jour.",
    menu: (line: string) => `Changer le statut du retour ${line}`,
    statusLine: (who: string, date: string) => `${who}, ${date}`,
  },

  corrections: {
    title: "Corrections à transmettre",
    description:
      "Regroupées par catégorie à partir des retours ouverts ou pris en compte.",
    none: "Aucune correction en attente sur cette version.",
    copy: "Copier les corrections",
    copied: "Corrections copiées.",
    heading: (name: string) => `Corrections — ${name}`,
    line: (timecode: string, body: string) => `- ${timecode} — ${body}`,
  },

  decision: {
    title: "Validation finale",
    description:
      "Soumettre pour retours et soumettre à validation finale sont deux actions différentes : l'absence de retour ouvert ne vaut pas validation.",
    none: "Aucune version soumise à validation finale.",
    waiting: (name: string) => `${name} attend la décision du validateur.`,
    readOnly:
      "Le responsable du projet ou un directeur créatif de l'équipe décide.",
    openComments: (n: number) =>
      n === 0
        ? "Aucun retour ouvert sur cette version."
        : n === 1
          ? "1 retour encore ouvert sur cette version."
          : `${n} retours encore ouverts sur cette version.`,
    fiche: "Relire la Fiche Livrable",
    seeVersion: "Voir la version et ses retours",
    legend: "Décision",
    choices: {
      approve: {
        label: "Valider",
        hint: "La version devient la version validée du livrable.",
      },
      changes: {
        label: "Demander des corrections",
        hint: "Le prestataire reprend la version.",
      },
      refuse: { label: "Refuser", hint: "La version est écartée." },
    },
    note: "Motif",
    noteHint: "Obligatoire pour demander des corrections ou refuser.",
    noteMissing: "Expliquez la décision.",
    choiceMissing: "Choisissez une décision.",
    submit: "Enregistrer la décision",
    done: "Décision enregistrée.",
    approved: (name: string) => `${name} est la version validée du livrable.`,
  },

  errors: {
    generic: "L'enregistrement a échoué. Réessayez.",
    invalid: "Certaines valeurs ne sont pas valides.",
    forbidden: "Vous ne pouvez pas faire cette modification.",
    notFound: "Élément introuvable.",
    withoutMedia:
      "Ajoutez un fichier ou un lien : sans eux, la version reste en brouillon.",
    transition: "La version a changé de statut entre-temps. Rechargez la page.",
    reasonRequired: "Un motif est obligatoire pour cette décision.",
    verifyFirst:
      "Une correction déclarée corrigée doit passer par « À vérifier » avant d'être résolue.",
    notSubmitted:
      "On ne commente pas un brouillon : soumettez d'abord la version.",
    submitted:
      "Une version soumise ne se modifie plus : déposez-en une nouvelle.",
    notMember: "Cette personne n'est pas membre de l'organisation.",
    contactNotFound: "Ce contact n'est plus dans le Réseau.",
  },
} as const;
