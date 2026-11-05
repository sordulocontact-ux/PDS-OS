/** Marketing › Activations: the messages the proto marks sent in one gesture
 * — « Brief et proposition » of a collaboration, « Récapitulatif pour
 * <agence> » (proto « Projet complet » mk.js collabCard, agencySection). */
export const activationBrief = {
  brief: {
    title: "Brief et proposition",
    fee: "Rémunération proposée",
    feeHint: "En euros HT",
    feeSource: (day: string) => `Tarif relevé dans le Réseau le ${day}`,
    deliverables: "Livrables",
    organic: "Droits organiques",
    organicDefault: (platform: string, artist: string) =>
      artist
        ? `Sur son compte ${platform} · republication par ${artist}`
        : `Sur son compte ${platform}`,
    ads: "Droits publicitaires",
    adsOptions: {
      none: "Non demandés",
      included: "Spark Ads · 30 jours · inclus",
      extra: "Spark Ads · 30 jours · en supplément",
    },
    adsExtra: "Supplément pour les droits publicitaires",
    adsExtraValue: (amount: string) => `Spark Ads · 30 jours · +${amount} € HT`,
    message: "Message",
    messageSource:
      "Repris du concept validé. PDS OS l'envoie par e-mail quand le créateur a une adresse dans le Réseau ; sinon copiez-le, puis indiquez qu'il est parti.",
    greeting: (first: string) => `Bonjour ${first},`,
    release: (artist: string, title: string, day: string | null) =>
      `${artist ? `${artist} sort « ${title} »` : `« ${title} » sort`}${day ? ` le ${day}` : ""}.`,
    idea: (angle: string) => `On aimerait que tu racontes : ${angle}.`,
    format: (format: string) => `Format : ${format}.`,
    key: (message: string) => `Message clé : ${message}.`,
    closing: "Tout est dans le brief joint ; dis-nous si la proposition te va.",
    channel: "Canal",
    channels: {
      email: "E-mail",
      dm: (platform: string) => `Message ${platform}`,
      whatsapp: "WhatsApp",
    },
    send: "Marquer le brief comme envoyé",
    sendByEmail: "Envoyer le brief par e-mail",
    // After an e-mail that did not leave, once the person sent it themselves.
    sendManual: "Je l'ai envoyé moi-même : marquer comme envoyé",
    sentByEmail: "Brief envoyé par e-mail",
    emailSubject: (project: string) => `« ${project} » : brief et proposition`,
    copy: "Copier le message",
    copied: "Message copié.",
    done: "Brief envoyé",
    errors: {
      fee: "Un montant en euros.",
      extra: "Le montant du supplément, en euros.",
      message: "Le message envoyé.",
      conceptNotValidated:
        "Le concept doit être validé avant d'envoyer le brief.",
      emailFailed:
        "L'e-mail n'est pas parti : rien n'est marqué envoyé. Réessayez, ou copiez le message, envoyez-le vous-même, puis marquez-le envoyé.",
      alreadySent:
        "Le brief et la proposition sont déjà partis : répondez dans la négociation.",
    },
  },
  recap: {
    title: (agency: string) => `Récapitulatif pour ${agency}`,
    message: "Message",
    source:
      "Écrit à partir de vos décisions, sans les notes internes. PDS OS l'envoie par e-mail quand l'agence a une adresse dans le Réseau ; sinon copiez-le, puis indiquez qu'il est parti.",
    send: "Marquer comme envoyé",
    sendByEmail: "Envoyer par e-mail",
    sendManual: "Je l'ai envoyé moi-même : marquer comme envoyé",
    sentByEmail: "Récapitulatif envoyé par e-mail",
    copy: "Copier le message",
    copied: "Message copié.",
    done: "Récapitulatif envoyé",
    sent: "Récapitulatifs envoyés",
    sentLine: (at: string, by: string) => `${at} par ${by}`,
    greeting: (first: string | null) =>
      first ? `Bonjour ${first},` : "Bonjour,",
    intro: (what: string, title: string, artist: string) =>
      `Voici nos retours sur ${what} pour « ${title} »${artist ? ` de ${artist}` : ""} :`,
    what: { influence: "les profils proposés", press: "les médias proposés" },
    sections: {
      validated: "Validés",
      refused: "Refusés",
      to_fix: "À corriger",
      to_discuss: "À discuter ensemble",
      waiting_info: "Il nous manque une information",
      to_review: "Encore à l'étude",
    },
    agency: "l'agence",
    thanks: (name: string) => `Merci, ${name}`,
    errors: {
      message: "Le message envoyé.",
      emailFailed:
        "L'e-mail n'est pas parti : rien n'est marqué envoyé. Réessayez, ou copiez le message, envoyez-le vous-même, puis marquez-le envoyé.",
    },
  },
};
