// What comes back signed by the person's private link (VISION-UX rule 19,
// proto « Projet complet », juridique-v2.html): their contract and their
// signature of the SACEM bulletin, on their page (/c/) and in the team's
// steps.
export const signedReturns = {
  portal: {
    contract: {
      title: "Votre contrat",
      action: "Signer votre contrat et le déposer",
      preparing:
        "PDS prépare votre contrat et le fait relire par sa direction. Vous le recevrez pour signature.",
      approved:
        "Votre contrat est approuvé : il vous sera envoyé pour signature très bientôt.",
      sentLink: (date: string) => `Mis sur votre page le ${date}.`,
      sentOther: (how: string, date: string) => `${how} le ${date}.`,
      sign: "Signez-le, puis déposez-le ici : c'est ce qui prouve la signature.",
      document: "Votre contrat",
      documentSource: "La version validée par PDS",
      file: "Votre contrat signé",
      send: "Envoyer mon contrat signé",
      sent: "Contrat signé envoyé",
      received: (date: string, owner: string) =>
        `Contrat signé reçu le ${date}. ${owner} le vérifie ; vous n'avez plus rien à faire.`,
      signed: "Contrat signé. Merci.",
    },
    bulletin: {
      title: (title: string) => `Le bulletin SACEM de « ${title} »`,
      action: "Signer le bulletin et le déposer",
      intro: (title: string) =>
        `Le bulletin déclare « ${title} » à la SACEM, avec votre part. Signez-le, puis déposez-le ici.`,
      document: "Bulletin à signer",
      documentSource: "Rempli par PDS depuis le dossier",
      file: "Le bulletin signé",
      send: "Envoyer le bulletin signé",
      sent: "Bulletin signé envoyé",
      signed: (date: string, owner: string) =>
        `Bulletin signé le ${date}. Merci : ${owner} le déposera à la SACEM.`,
    },
    signedBadge: "Signé",
    download: "Télécharger",
    fileHint: "Un PDF, 20 Mo au plus",
    fileChosen: (name: string) => `Fichier choisi : ${name}`,
    someone: "PDS",
  },
  errors: {
    file: "Déposez le document signé.",
    notPdf:
      "Ce fichier n'est pas un PDF : enregistrez la version signée en PDF, puis déposez-la.",
    tooLarge: "Ce fichier dépasse 20 Mo : réduisez-le, puis déposez-le.",
    closed: "Ce document ne vous est plus demandé sur ce lien.",
    notSent: "Ce contrat ne vous a pas encore été envoyé.",
    already: "Vous avez déjà déposé ce document : PDS le vérifie.",
    signatureClosed: "Ce bulletin n'attend plus votre signature.",
    upload: "Le fichier n'a pas pu être envoyé. Réessayez.",
    failed: "L'envoi n'a pas abouti. Réessayez.",
  },
  team: {
    sendTo: (name: string) => `Envoyer à ${name}`,
    sendNote: (name: string) =>
      `PDS OS n'a pas l'adresse de ${name} : le contrat validé est mis sur sa page privée, où il le signera et le déposera. Copiez ensuite le lien de sa page et envoyez-le-lui.`,
    noLink: (name: string) =>
      `${name} n'a pas encore de lien privé sur ce projet : créez-le, puis envoyez-lui le contrat : il le signera et le déposera sur sa page.`,
    createLink: "Créer son lien privé",
    other: "Je l'ai remis autrement",
    otherBody: (person: string) =>
      `Le contrat a été remis à ${person} hors de son lien privé : dites comment, et quand.`,
    howLegend: "Comment l'avez-vous remis ?",
    ways: [
      "Remis en main propre",
      "Envoyé par un outil de signature",
      "Envoyé depuis ma messagerie",
    ],
    on: "Le",
    note: "Noter la remise",
    cancel: "Annuler",
    sent: (name: string) => `Contrat envoyé à ${name}`,
    noted: "Remise notée",
    waiting: (name: string) =>
      `En attente de ${name} : signer et renvoyer son contrat.`,
    sentLink: (date: string) => `mis sur son lien privé le ${date}`,
    sentOther: (how: string, date: string) => `${how.toLowerCase()} le ${date}`,
    otherwise: "Le signé vous est parvenu autrement ?",
    received: (name: string) => `Reçu de ${name} par son lien privé`,
    // JUR-11: both parties sign, the team checks before « signé ».
    checkTitle: "Vérification de la signature",
    checkVersion: "Version signée",
    checkVersionValue: (version: number) =>
      `v${version}, la version validée par la direction et envoyée`,
    checkSigner: "Signataire",
    checkSignerValue: (name: string) => `${name} · déposé par son lien privé`,
    checkPds: "Signature pour PDS",
    checkPdsDone: (name: string, at: string) =>
      `${name}, habilitée à signer pour PDS · le ${at}`,
    checkPdsMissing: (direction: string) =>
      `Manquante : ${direction}, habilitée à signer pour PDS, doit signer`,
    checkDevices: "Dispositifs de signature",
    checkDevicesValue: (name: string) =>
      `${name} : signature sur le PDF déposé · PDS : le même PDF signé ensuite par la direction. Une confirmation dans PDS OS n'est jamais une signature.`,
    checkBox: (name: string) =>
      `J'ai vérifié que la signature est bien celle de ${name}, sur chaque page à parapher`,
    checkMissing:
      "Cochez après avoir vérifié la signature : c'est ce qui permet de le marquer signé.",
    countersign: "Signer le contrat pour PDS",
    countersigning: "Signature…",
    countersigned: "Contrat signé pour PDS",
    // The person signs first, then PDS (Ibé, 07/11/2026).
    countersignBody: (person: string) =>
      `${person} a signé. Signez ce PDF à votre tour pour PDS, avec votre outil habituel, puis déposez-le : c'est l'exemplaire signé des deux parties.`,
    countersignMissing:
      "Le contrat ne vaut qu'avec la signature de PDS : la direction doit d'abord le signer.",
    awaitingCountersign: (direction: string) =>
      `En attente de ${direction} : signer le contrat pour PDS.`,
    pdsFile: "Le contrat signé des deux parties (PDF)",
    pdsFileHint: "Le PDF signé par la personne, signé à son tour pour PDS",
    pdsFileMissing:
      "Déposez d'abord le PDF signé pour PDS : l'exemplaire signé des deux parties.",
    notReturned:
      "La personne signe en premier : PDS signe une fois son exemplaire signé revenu.",
    signedFile: "Contrat signé",
    depositedBy: (name: string, date: string) =>
      `Déposé par ${name} le ${date}`,
    viewPdf: "Voir le PDF",
    proof: "Preuve de signature",
    proofValue: "Dépôt par son lien privé, horodaté",
    proofSource: "Gardé dans l'historique",
    verify:
      "Vérifiez que c'est bien le document envoyé, signé, avant de le marquer comme signé.",
    errors: {
      noLink: "Créez d'abord son lien privé.",
      how: "Choisissez comment vous l'avez remis.",
      date: "Indiquez le jour de la remise (aujourd'hui au plus tard).",
      failed: "L'envoi n'a pas abouti. Réessayez.",
    },
  },
  sacem: {
    pending: "En attente",
    onLink: "Sur son lien privé",
    // Made with the version to sign (Sacha, 10/11/2026); else « Créer le
    // lien » on the signer's link card.
    noLink: "Pas encore de lien privé",
    noContact: "Sans fiche dans le Réseau : pas de lien privé",
    // The e-mail PDS OS sends each signer with the version to sign.
    auto: {
      subject: (title: string) => `« ${title} » : le bulletin SACEM à signer`,
      body: (title: string) =>
        `Le bulletin SACEM de « ${title} » est prêt. Vous pouvez le télécharger, le signer et nous le renvoyer depuis votre page, sans compte.`,
      open: "Ouvrir votre page :",
    },
    byLink: (date: string) => `Par son lien privé · le ${date}`,
    otherwise: (date: string) => `A signé autrement · le ${date}`,
    signedOtherwise: "A signé autrement",
    signedOn: "Signé le",
    signedOnHint: "En main propre, sur papier… La date fait foi.",
    signedOnMissing: "Indiquez le jour de la signature.",
    note: "Noter la signature",
    scan: "Le bulletin signé, scanné (PDF)",
    otherwiseBody: (name: string) =>
      `${name} a signé hors de son lien privé : la date et le bulletin signé scanné en sont la preuve.`,
    noted: (name: string) => `Signature de ${name} notée`,
    viewPdf: "Voir le PDF",
    // PDS Éditions' line, signed by the direction in PDS OS (JUR-03).
    houseWaits: "À signer par la direction, dans PDS OS",
    byHouse: (date: string) =>
      `Signé dans PDS OS par la direction · le ${date}`,
    signHouse: "Signer pour PDS Éditions",
    signingHouse: "Signature…",
    signedHouse: "Bulletin signé pour PDS Éditions",
    signHouseBody:
      "Signature électronique simple dans PDS OS, horodatée, liée à votre compte, sur cette version du bulletin.",
    // A change to the bulletin after a signature (JUR-03).
    superseded: "Ne vaut plus",
    supersededNote:
      "Le bulletin a changé après cette version : chacun signe la nouvelle.",
    replaced: "Versions remplacées",
    replacedLine: (version: number, date: string, signed: number) =>
      `V${version}${date ? ` · remplacée le ${date}` : ""} · ${
        signed === 0
          ? "aucune signature reçue"
          : signed === 1
            ? "1 signature qui ne vaut plus"
            : `${signed} signatures qui ne valent plus`
      }`,
  },
} as const;
