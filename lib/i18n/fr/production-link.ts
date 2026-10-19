// The provider's private link, its part of the journey (Ibé, 14/10): the
// company's quote, progress and places, the director's proposal, the
// director of photography's gear list, the actions given to each.
export const productionLink = {
  tasks: { title: "Vos tâches", due: (date: string) => `Pour le ${date}` },
  director: {
    title: "Proposer un réalisateur",
    action: "Proposer un réalisateur",
    yours: "Votre proposition",
    name: "Nom",
    reel: "Lien du showreel",
    why: "Pourquoi lui",
    submit: "Proposer à PDS",
    done: "Proposition envoyée à PDS.",
    sent: "Envoyé à PDS",
    another: "Proposer un autre réalisateur",
    by: (company: string, at: string) => `Proposé par ${company} le ${at}`,
    status: { proposed: "Proposé", retained: "Retenu", declined: "Non retenu" },
    errors: {
      name: "Le nom du réalisateur.",
      reel: "Un lien qui commence par https://.",
    },
  },
  call: {
    next: "Votre prochain rendez-vous avec PDS",
    held: (day: string) => `Call de production du ${day}`,
    invited: "Invité",
    when: "Quand",
    where: "Où",
    video: "visio",
    onSite: "sur place",
    participants: "Participants",
    agenda: "Ordre du jour",
    invitedBy: (who: string, at: string) =>
      `Invitation envoyée par ${who} le ${at}.`,
    asked: "Ce qui vous a été demandé",
    confirmed: "Confirmé par PDS après le call",
    todo: "À faire",
    nothingYet:
      "PDS confirme les suites du call ; ce qui vous concerne apparaîtra ici.",
  },
  quote: {
    title: "Devis",
    depositV: (n: number) => `Déposer le devis V${n}`,
    before: (day: string) => `avant le ${day}`,
    file: "Devis (PDF)",
    fileHint: "Le lien du PDF (Drive, WeTransfer…), commence par https://",
    loc: "Dont montant prévu pour les lieux",
    locHint: (days: number, day: string | null) =>
      `Location des lieux pour ${days} jour${days > 1 ? "s" : ""} de tournage${day ? ` (${day})` : ""}. Le lieu retenu y sera comparé.`,
    revision: (reason: string) => `PDS demande une révision : « ${reason} »`,
    pds: "PDS",
    waitCheck: "En attente de PDS : vérifier le devis",
    waitDecide: "En attente de PDS : valider le devis",
    description:
      "Déposez-le ici : le chargé de production le vérifie, puis il est validé chez PDS.",
    // Never the internal envelope (VISION-UX rule 21): the delivery only.
    frame: (delivery: string | null) =>
      delivery ? `Livraison attendue au plus tard le ${delivery}` : null,
    label: "Intitulé",
    labelDefault: "Devis de production",
    amount: "Montant total HT",
    delivery: "Livraison proposée",
    url: "Lien du devis (PDF en ligne, Drive…)",
    note: "Note pour PDS",
    submit: "Déposer le devis",
    redo: "Déposer un devis corrigé",
    done: "Devis déposé : PDS est prévenu.",
    status: {
      deposited: "Reçu, en vérification",
      submitted: "En validation chez PDS",
      approved: "Validé",
      rejected: "Refusé",
    },
    reason: (text: string) => `Motif : « ${text} »`,
  },
  progress: {
    title: "Votre préproduction",
    description:
      "Cochez ce qui est fait : PDS suit sans vous demander de tout ressaisir.",
    items: {
      calls: "Calls techniques faits",
      gear: "Matériel réservé",
      crew: "Équipe confirmée",
      schedule: "Planning de tournage envoyé",
    },
    saved: "Avancement enregistré.",
  },
  places: {
    title: "Proposer des lieux",
    description:
      "Nom, adresse, tarif, contraintes : PDS donne son avis et en retient un.",
    proposed: "Vos lieux proposés",
    name: "Nom du lieu",
    address: "Adresse",
    price: "Tarif par jour HT",
    availability: "Disponibilités",
    constraints: "Contraintes",
    url: "Lien (photos, fiche du lieu)",
    submit: "Proposer ce lieu",
    done: "Lieu proposé à PDS.",
    status: { candidate: "En discussion", chosen: "Retenu" },
  },
  direction: {
    title: "Votre proposition de réalisation",
    description:
      "L'intention, le découpage, les références : la partie créative de PDS la valide ou vous demande des modifications.",
    intent: "Intention de réalisation",
    runOfShow: "Découpage",
    runOfShowHint: "Une séquence par ligne",
    references: "Références",
    submit: "Envoyer à PDS",
    done: "Proposition envoyée : PDS est prévenu.",
    status: {
      draft: "À écrire",
      submitted: "En validation chez PDS",
      approved: "Validée",
      changes: "Modifications demandées",
    },
    changes: (text: string) => `PDS demande : « ${text} »`,
  },
  gear: {
    title: "Votre liste caméra et lumière",
    description:
      "Un article par ligne, la quantité devant si besoin (« 2 × Aputure 600d ») : PDS en fait des lignes de matériel à chiffrer.",
    lines: "Matériel",
    submit: "Envoyer la liste",
    done: (n: number) =>
      n === 1 ? "1 ligne envoyée." : `${n} lignes envoyées.`,
    count: (n: number) =>
      n === 1
        ? "1 ligne de matériel chez PDS"
        : `${n} lignes de matériel chez PDS`,
  },
  errors: {
    amount: "Indiquez le montant HT.",
    url: "Le lien doit commencer par https://",
    name: "Donnez un nom au lieu.",
    direction: "Écrivez l'intention et le découpage.",
    lines: "Écrivez au moins un article.",
  },
} as const;
