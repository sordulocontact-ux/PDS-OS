// The Mixage and Mastering steps of the Master (proto `master-v2.html`):
// before sending, the private link, the rate, the versions, the feedback,
// the decision and the reopening.

const first = (name: string) => name.split(" ")[0] ?? name;

export const masterRound = {
  before: {
    title: "Avant d'envoyer",
    source: { mix: "Source confirmée", mastering: "Mix final validé" },
    brief: "Brief enregistré",
    stems: "Pistes séparées",
    dates: "Dates à venir",
    ready: "Prêt",
    toRecord: "À enregistrer",
    missing: "Manquant",
    briefReady: "Prêt à transmettre",
    briefDirty: "Des modifications ne sont pas enregistrées",
    briefNever: "Pas encore enregistré",
    stemsCount: (n: number) =>
      n > 1 ? `${n} fichiers de pistes` : "1 fichier de pistes",
    stemsNone: (titles: string) => `Aucune piste pour ${titles}`,
    mixV1: (day: string) => `Mix V1 attendu le ${day}`,
    mastering: (day: string) => `Mastering attendu le ${day}`,
  },
  blockers: {
    briefDirty: (name: string) =>
      `Le Brief a des modifications non enregistrées : enregistrez-le, sinon ${first(name)} recevra l'ancien dossier.`,
    briefNotRecorded: "Enregistrez le Brief avant d'envoyer le dossier.",
    vocals:
      "Le mix attend les voix définitives : confirmez la nouvelle source à leur arrivée, puis le dossier part.",
    openBrief: "Ouvrir le Brief",
  },
  package: {
    title: {
      mix: "Dossier pour le mixeur",
      mastering: "Dossier pour le mastering",
    },
    note: (name: string) =>
      `Calculé à partir du Brief et des fichiers confirmés : c'est exactement ce que ${first(name)} recevra. Les tarifs restent internes.`,
  },
  email: {
    title: "L'e-mail à envoyer",
    hint: "PDS OS n'envoie pas encore d'e-mail : il crée le lien privé ; copiez-le ou écrivez l'e-mail, puis « Marquer comme envoyé ».",
    to: "À",
    subject: "Objet",
    subjectValue: (title: string, stage: "mix" | "mastering") =>
      stage === "mix"
        ? `« ${title} » : votre dossier de mix`
        : `« ${title} » : le mastering peut commencer`,
    message: "Message",
    noEmail: "Pas d'adresse dans le Réseau",
    link: "Ajouté à la fin : Ouvrir votre dossier — lien privé créé à l'envoi, sans compte.",
  },
  stems: {
    missing:
      "Il manque les pistes séparées. L'envoi n'est possible qu'avec une dérogation, écrite et gardée dans l'historique.",
    reason: "Pourquoi envoyer quand même",
    reasonError: "Écrivez pourquoi le dossier part sans pistes.",
  },
  send: {
    to: (name: string) => `Envoyer à ${name}`,
    toWaiver: (name: string) => `Envoyer à ${name} avec une dérogation`,
    sameEngineer: "Transmettre au mastering",
    sending: "Envoi…",
    done: (name: string) => `Dossier envoyé à ${name}`,
    resend: "Renvoyer le dossier",
    resent: "Dossier renvoyé",
    briefChanged: (name: string) =>
      `Le Brief a changé depuis l'envoi : ${first(name)} a toujours l'ancien dossier.`,
  },
  mastering: {
    ready: "Le Mix final est validé. Le Mastering peut commencer.",
    same: (name: string) =>
      `Même ingénieur que le mix : poursuivez avec ${name}.`,
    other: (name: string) =>
      `Ingénieur du mastering : ${name}, qui reçoit son propre lien : il ne voit que le mastering.`,
    choose: "Choisissez l'ingénieur du mastering dans le Brief.",
  },
  link: {
    title: (name: string) => `Lien privé de ${first(name)}`,
    steps: {
      created: "Créé",
      sent: "Envoyé",
      opened: "Ouvert",
      taken: "Pris en charge",
      received: "Fichier reçu",
    },
    copy: "Copier le lien",
    copied: "Lien copié",
    remind: "Relancer",
    remindSubject: (title: string) =>
      `« ${title} » : votre dossier vous attend`,
    renew: "Renouveler le lien",
    renewed: "Lien renouvelé",
    revoke: "Révoquer le lien",
    revokeReason: "Pourquoi vous le révoquez",
    revoked: "Lien révoqué",
    revokedLine: (
      day: string,
      by: string | null,
      reason: string,
      name: string,
    ) =>
      `Lien révoqué ${day}${by ? ` par ${by}` : ""} : « ${reason} ». ${name} ne peut plus l'ouvrir ; ce qu'il a déposé reste.`,
    markSent: "Marquer comme envoyé",
    marked: "Lien marqué comme envoyé",
    footer: (name: string, day: string, email: string | null) =>
      `Lien privé de ${name} · valable jusqu'au ${day}${email ? ` · à envoyer à ${email}` : ""}`,
    expires: (name: string, days: number, day: string) =>
      `Le lien de ${first(name)} expire dans ${days} jour${days > 1 ? "s" : ""} (${day}).`,
    expired: (day: string) => `Le lien a expiré ${day}.`,
    shownOnce:
      "Ce lien a été créé avant le 19/10/2026 : il n'a été affiché qu'une fois. Renouvelez-le pour le retrouver ici.",
    continued: (name: string) =>
      `Même lien que pour le mix : ${first(name)} retrouve le mastering sur son lien.`,
  },
  rate: {
    title: "Tarif",
    line: (stage: "mix" | "mastering", name: string) =>
      `${stage === "mix" ? "Mix" : "Mastering"} · ${name}`,
    proposed: "Proposé",
    committed: "Engagé",
    estimated: "Estimé",
    proposedBy: (name: string, day: string, same: boolean) =>
      `Proposé par ${name} ${day}${same ? " · c'est le tarif estimé" : ""}`,
    accept: "Accepter le tarif",
    accepted: "Tarif accepté : le montant est engagé",
    note: "Un montant proposé ne consomme pas le budget : il ne compte qu'une fois accepté.",
    euros: (v: string) => `${v} € HT`,
  },
  versions: {
    title: (label: string, n: number) =>
      `${label} · ${n > 1 ? `${n} versions` : "1 version"}`,
    hint: "Chacune s'écoute avant de décider",
    none: (name: string) =>
      `Aucune version pour l'instant : ${first(name)} dépose la première sur son lien.`,
    previous: (n: number) => `Versions précédentes (${n})`,
    name: (label: string, n: number) => `${label} V${n}`,
    meta: (by: string, day: string, source: string | null) =>
      [by, day, source ? `sur ${source}` : null].filter(Boolean).join(" · "),
    deposited: (name: string, viaLink: boolean, day: string) =>
      viaLink
        ? `déposée par ${name} par son lien le ${day}`
        : `déposée par ${name} le ${day}`,
    states: {
      listen: "En écoute",
      sent: "Retours envoyés",
      changes: "Modification demandée",
      approved: { mix: "Mix validé", mastering: "Master validé" },
      reopened: "Rouverte",
    },
    changesNote: (by: string | null, day: string, text: string) =>
      `${by ?? "La validatrice"} (demander une modification, ${day}) : « ${text} »`,
    approvedNote: (label: string, by: string | null, day: string) =>
      `Validée${by ? ` par ${by}` : ""} ${day} : c'est le ${label.toLowerCase()} final, il ne changera plus.`,
    reopenedNote: (by: string | null, day: string, reason: string) =>
      `Rouverte${by ? ` par ${by}` : ""} ${day} : « ${reason} ». Elle reste dans l'historique.`,
    sentNote: (day: string, text: string) =>
      `Retours transmis ${day}, sans décision : « ${text} »`,
  },
  feedback: {
    title: (label: string, n: number) => `Retours sur le ${label} V${n}`,
    empty: "Aucun retour pour l'instant.",
    timecode: "Minutage",
    timecodeHint: "Par exemple 0:42",
    timecodeError: "Un minutage comme 1:23.",
    body: "Mon retour",
    add: "Ajouter mon retour",
    added: "Retour ajouté",
    teamOnly: (engineer: string, validator: string) =>
      `Visible par l'équipe seulement : ${engineer} reçoit la demande de modification décidée par ${validator}, ou les retours que vous lui transmettez.`,
    by: (name: string | null, day: string) =>
      [name, day].filter(Boolean).join(" · "),
  },
  transmit: {
    title: "Transmettre les retours sans décider",
    meta: (engineer: string, validator: string) =>
      `${first(engineer)} avance pendant que ${validator} écoute`,
    text: "Les retours à transmettre",
    hint: (engineer: string) =>
      `${first(engineer)} les lit sur son lien. Ce n'est pas une décision : la version reste en écoute.`,
    button: (engineer: string) =>
      `Transmettre les retours à ${first(engineer)}`,
    done: "Retours transmis",
    error: "Écrivez les retours à transmettre.",
  },
  decision: {
    title: "Votre décision",
    approve: (label: string) => `Valider ce ${label.toLowerCase()}`,
    changes: "Demander une modification",
    comment: "Ce qu'il faut changer",
    commentHint: (engineer: string) =>
      `Visible par l'équipe et par ${engineer}. Chaque ligne garde son auteur.`,
    commentRequired: (engineer: string) =>
      `Écrivez ce qu'il faut changer : ce sera le retour de ${first(engineer)}.`,
    approved: (label: string) => `${label} validé`,
    changed: "Modification demandée",
    waiting: (who: string, label: string, n: number) =>
      `En attente de ${who} : valider le ${label} V${n}.`,
    working: (file: string) =>
      `Ce mix repose sur ${file}, une version de travail : les voix définitives ne sont pas encore là. Il ne peut pas devenir le mix final.`,
    final: (label: string, n: number, by: string | null) =>
      `${label} V${n} validé${by ? ` par ${by}` : ""} : c'est le ${label.toLowerCase()} final. Plus aucun dépôt n'est possible.`,
    errors: {
      working:
        "Ce mix repose sur une version de travail : il ne peut pas devenir le mix final.",
      failed: "La décision n'a pas pu être enregistrée. Réessayez.",
    },
  },
  reopen: {
    button: "Rouvrir le mix",
    reason: "Pourquoi rouvrir le mix",
    done: "Mix rouvert",
    hint: "Possible tant que le mastering n'est pas parti : la décision reste dans l'historique, l'ingénieur peut déposer une nouvelle version.",
    errors: {
      started:
        "Le mastering est parti sur ce mix : il ne peut plus être rouvert.",
      failed: "Le mix n'a pas pu être rouvert. Réessayez.",
    },
    // « Rouvrir le master »: same rule, until the Distribution delivered.
    master: {
      button: "Rouvrir le master",
      reason: "Pourquoi rouvrir le master",
      placeholder: "Mona veut une voix plus en avant sur le dernier refrain.",
      done: "Master rouvert",
      hint: "Possible tant que la Distribution n'a pas livré la sortie : la décision reste dans l'historique, le titre repasse de « Master final » à « Master », l'ingénieur peut déposer une nouvelle version.",
      delivered:
        "La Distribution a livré la sortie : ce master ne peut plus être rouvert.",
      failed: "Le master n'a pas pu être rouvert. Réessayez.",
    },
  },
  take: {
    title: "Prendre en charge le dossier",
    estimate: "Tarif estimé par PDS d'après vos tarifs habituels",
    line: (stage: "mix" | "mastering", euros: string) =>
      `${stage === "mix" ? "Mix" : "Mastering"} · ${euros} € HT`,
    unknown: "PDS n'a pas encore estimé le tarif : proposez le vôtre.",
    legend: "Le tarif",
    confirm: "Je confirme ce tarif",
    propose: "Je propose un autre tarif",
    amount: (stage: "mix" | "mastering") =>
      stage === "mix" ? "Mix (€ HT)" : "Mastering (€ HT)",
    hint: "PDS valide votre tarif avant de l'engager.",
    button: "Prendre en charge le dossier",
    done: "Dossier pris en charge",
    doneHint: (owner: string) =>
      `Votre tarif est envoyé à ${owner} : le label le valide avant de l'engager.`,
    taken: (day: string) => `Pris en charge le ${day}. Merci !`,
    errors: {
      amount: "Un montant en euros, par exemple 800.",
      choice: "Confirmez le tarif ou proposez le vôtre.",
      failed: "La prise en charge n'a pas pu être enregistrée. Réessayez.",
    },
  },
  portal: {
    package: "Votre dossier",
    versions: { mix: "Mix", mastering: "Mastering" },
    deposit: "Déposer votre version",
    thread: "Échanges avec le label",
    newSource: (day: string, file: string) =>
      `Nouvelle source le ${day} : ${file}, et ses pistes. Vos prochaines versions partent de là.`,
  },
  notNeeded: (
    file: string,
    by: string | null,
    day: string,
    reason: string | null,
  ) =>
    `Non nécessaire : le mix existe déjà. ${file}, utilisé comme mix final${by ? ` par ${by}` : ""} ${day}${reason ? ` : « ${reason} »` : ""}.`,
} as const;
