// The Mixage and Mastering steps of the Master (proto `master-v2.html`):
// before sending, the private link, the rate, the versions, the feedback,
// the decision and the reopening.

const first = (name: string) => name.split(" ")[0] ?? name;
const dossierOf = (stage: "mix" | "mastering") =>
  stage === "mix" ? "mixage" : "mastering";

export const masterRound = {
  before: {
    stems: "Pistes séparées",
    missing: "Manquant",
    stemsCount: (n: number) =>
      n > 1 ? `${n} fichiers de pistes` : "1 fichier de pistes",
    stemsNone: (titles: string) => `Aucune piste pour ${titles}`,
    stemsAdd: (title: string) => `Ajouter les pistes séparées de ${title}`,
    stemsDialog: {
      title: (title: string) => `Ajouter les pistes séparées · ${title}`,
      description:
        "Une piste par instrument ou par voix (voix, batterie, basse…), exportée depuis la session du titre par le producteur. L'ingénieur du mix en a besoin pour travailler chaque élément séparément.",
      drop: "Déposez les fichiers ici, ou cliquez pour les choisir",
      formats: "ZIP, WAV, AIFF ou FLAC · 50 Mo au plus par fichier",
      noFile: "Choisissez au moins un fichier de pistes.",
      wrongFormat: (names: string) =>
        `Seuls les fichiers ZIP, WAV, AIFF ou FLAC sont acceptés : ${names}.`,
      precision: "Précision",
      placeholder: "Ex. Export du 3 novembre",
    },
  },
  // The package as the engineer will get it (proto « Dossier pour le
  // mixeur »): one fact per line, each with where it comes from.
  dossier: {
    line: (name: string) =>
      `Calculé à partir du Brief et des fichiers confirmés : c'est exactement ce que ${first(name)} recevra.`,
    lineNoEngineer:
      "Calculé à partir du Brief et des fichiers confirmés : c'est exactement ce que l'ingénieur recevra.",
    title: { mix: "Titre à mixer", mastering: "Titre à masteriser" },
    titleValue: (title: string, artists: string) =>
      artists ? `« ${title} » · ${artists}` : `« ${title} »`,
    source: { mix: "Source", mastering: "Mix final à masteriser" },
    sourceMissing: {
      mix: "Source à confirmer",
      mastering: "Mix final à valider",
    },
    stems: "Pistes séparées",
    direction: "Direction artistique",
    directionGroups: {
      direction: "Direction",
      references: "Références",
      constraints: "Contraintes",
    },
    deliverables: "Livrables",
    formats: "Formats de livraison",
    dates: "Échéances",
    release: (day: string) => `Sortie prévue le ${day}`,
    revisions: "Révisions incluses",
    message: {
      mix: "Message pour le mixeur",
      mastering: "Message pour l'ingénieur mastering",
    },
    from: {
      catalog: "Catalogue",
      source: "Étape Source",
      mixFinal: "Mix final validé",
      stems: "Catalogue › Fichiers de travail",
      brief: "Brief",
    },
    internal: "Les tarifs restent internes : ils ne sont pas dans le dossier.",
    sameLink: (name: string) =>
      ` Le dossier s'ajoute au lien de ${first(name)} : aucun nouveau lien n'est créé.`,
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
    to: "À",
    subject: "Objet",
    subjectValue: (title: string, stage: "mix" | "mastering") =>
      stage === "mix"
        ? `« ${title} » : votre dossier de mix`
        : `« ${title} » : le mastering peut commencer`,
    message: "Message",
    noEmail: "Pas d'adresse dans le Réseau",
    // PDS OS sends it itself (EMAIL_SMTP_*, lib/email/send.ts).
    sendTitle: "L'e-mail que PDS OS enverra",
    declaredTitle: "L'e-mail à envoyer",
    sendLine: (sender: string) =>
      `De : l'adresse de PO, au nom de ${sender} · gardé dans l'historique, c'est la preuve d'envoi`,
    declaredLine:
      "PDS OS crée le lien privé : copiez-le ou écrivez l'e-mail depuis votre messagerie, puis « Marquer comme envoyé ».",
    toSource: "Réseau",
    added: "Ajouté automatiquement à la fin de l'e-mail :",
    addedSame:
      "Ajouté automatiquement à la fin de l'e-mail, avec le même lien que pour le mix :",
    openLabel: "Ouvrir votre dossier :",
    openNew: "lien privé créé à l'envoi",
    openSame: "le lien qu'il a déjà pour le mix",
    linkValidity: (day: string) =>
      `Lien privé, sans compte · valable jusqu'au ${day}`,
    defaultMessage: (
      engineer: string,
      title: string,
      stage: "mix" | "mastering",
    ) =>
      stage === "mix"
        ? `Bonjour ${first(engineer)}, voici le dossier du mix de « ${title} ». Tout est sur votre lien privé : les fichiers, le Brief et les dates.`
        : `Bonjour ${first(engineer)}, le mix final de « ${title} » est validé : le dossier du mastering est sur votre lien.`,
    signature: (sender: string) => `${sender}, PDS`,
    open: "Ouvrir votre dossier :",
    validity: (day: string) =>
      `Lien privé, sans compte, valable jusqu'au ${day}.`,
    sent: (name: string) => `Dossier envoyé par e-mail à ${name}`,
    failed:
      "Le dossier est prêt, mais l'e-mail n'est pas parti : copiez le lien ci-dessous et envoyez-le vous-même.",
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
  // The engineer's page by project, opened on the package (Figma 378-6581,
  // Sacha 04/11): one link for all PDS expects from them.
  link: {
    title: (name: string) => `Lien de ${name}`,
    states: {
      notSent: "Pas encore envoyé",
      sent: "Envoyé",
      opened: "Ouvert",
      none: "Pas de lien",
    },
    dates: (stage: "mix" | "mastering", dossier: string, link: string | null) =>
      `Dossier de ${dossierOf(stage)} accessible jusqu'au ${dossier}${link ? ` · lien valable jusqu'au ${link}` : ""}`,
    noLink: (name: string) =>
      `${first(name)} n'a plus de lien : le dossier reste sur sa page dès qu'un nouveau lien est créé.`,
    copy: "Copier le lien",
    copied: "Lien copié",
    remind: "Relancer",
    remindSubject: (title: string) =>
      `« ${title} » : votre dossier vous attend`,
    create: "Créer le lien",
    created: "Lien créé",
    renew: "Nouveau lien",
    renewed: "Nouveau lien créé",
    renewHint:
      "Un nouveau lien remplace l'ancien, qui cesse de marcher ; ce qui a été déposé reste.",
    more: (name: string) => `Autres actions sur le lien de ${name}`,
    withdraw: (stage: "mix" | "mastering") =>
      `Retirer le dossier de ${dossierOf(stage)}`,
    withdrawReason: "Pourquoi vous retirez le dossier",
    withdrawn: "Dossier retiré",
    withdrawnLine: (
      day: string,
      by: string | null,
      reason: string,
      name: string,
    ) =>
      `Dossier retiré ${day}${by ? ` par ${by}` : ""} : « ${reason} ». ${first(name)} ne le voit plus sur sa page ; ce qu'il a déposé reste.`,
    resend: "Renvoyer le dossier",
    resent: "Dossier renvoyé",
    revoke: "Révoquer le lien",
    revokeHint:
      "Le lien cesse de marcher tout de suite, pour tout le projet ; ce qui a été déposé reste.",
    revokeReason: "Pourquoi vous révoquez le lien",
    revoked: "Lien révoqué",
    markSent: "Marquer comme envoyé",
    marked: "Lien marqué comme envoyé",
    expires: (name: string, days: number, day: string) =>
      `Le dossier de ${first(name)} se ferme dans ${days} jour${days > 1 ? "s" : ""} (${day}).`,
    expired: (day: string) => `Le dossier s'est fermé ${day}.`,
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
  },
  // The validator's decision at the head of the step (lot 4 of Ibé's
  // feedback), the rest folded.
  lead: {
    title: (title: string) => `« ${title} »`,
    more: (engineer: string) =>
      engineer
        ? `Tarif, lien privé et échanges avec ${engineer}`
        : "Tarif, lien privé et échanges",
  },
  versions: {
    title: (label: string, n: number) =>
      `${label} · ${n > 1 ? `${n} versions` : "1 version"}`,
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
    approvedNote: (label: string, by: string | null, day: string) =>
      `Validée${by ? ` par ${by}` : ""} ${day} : c'est le ${label.toLowerCase()} final, il ne changera plus.`,
    reopenedNote: (by: string | null, day: string, reason: string) =>
      `Rouverte${by ? ` par ${by}` : ""} ${day} : « ${reason} ». Elle reste dans l'historique.`,
  },
  // Feedback grouped by version (lot 7 of Ibé's feedback): what stays in
  // the team, apart from what was sent to the engineer, and the chain
  // « Mix V1 → demande à Karim → Mix V2 ».
  chain: {
    internal: "Retours de l'équipe",
    internalBadge: "Interne",
    internalHint: (engineer: string) =>
      `Jamais envoyés tels quels à ${first(engineer)}.`,
    sentBadge: (engineer: string) => `Envoyé à ${first(engineer)}`,
    request: (engineer: string) =>
      `Demande de modification envoyée à ${first(engineer)}`,
    transmitted: (engineer: string) =>
      `Retours transmis à ${first(engineer)}, sans décision`,
    sentMeta: (by: string | null, day: string) =>
      [by, day].filter(Boolean).join(" · "),
    answers: (label: string, n: number, day: string) =>
      `Corrections reçues : répond à la demande sur le ${label} V${n} du ${day}`,
  },
  feedback: {
    title: (label: string, n: number) => `Retours sur le ${label} V${n}`,
    empty: "Aucun retour pour l'instant.",
    timecode: "Minutage",
    timecodeHint: "0:42",
    timecodeError: "Un minutage comme 1:23.",
    body: "Mon retour",
    add: "Ajouter",
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
    // What lifts it (retour « Néons » 05), then how the validation resumes.
    unblock: {
      vocals:
        "Les voix définitives ne sont pas encore confirmées sur l'État du master.",
      newMix: (engineer: string) =>
        `Les voix définitives sont confirmées : il faut un mix fait sur ces voix. Demandez une modification à ${first(engineer)} ci-dessous.`,
      then: (engineer: string) =>
        `Ensuite, ${first(engineer)} dépose un mix sur les voix définitives : c'est cette version que vous pourrez valider.`,
    },
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
      `${stage === "mix" ? "Mix" : "Mastering"} · ${euros}`,
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
    // The engineer's page by progress (lot 6 of Ibé's feedback).
    reply: "Répondre au label",
    // Above the drop zone: what the label asked for the next version.
    asked: (n: number) => `Ce que le label demande pour la V${n}`,
    seePackage: "Revoir le dossier : fichiers et Brief",
    otherVersion: "Envoyer une autre version",
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
