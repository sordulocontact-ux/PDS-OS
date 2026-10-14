// The provider's private link, its part of the journey (Ibé, 14/10): the
// company's quote, progress and places, the director's proposal, the
// director of photography's gear list, the actions given to each.
export const productionLink = {
  tasks: { title: "Vos tâches", due: (date: string) => `Pour le ${date}` },
  quote: {
    title: "Votre devis",
    description:
      "Déposez-le ici : le chargé de production le vérifie, puis il est validé chez PDS.",
    frame: (envelope: string | null, delivery: string | null) =>
      [
        envelope ? `Enveloppe : ${envelope}` : null,
        delivery ? `Livraison attendue au plus tard le ${delivery}` : null,
      ]
        .filter(Boolean)
        .join(" · "),
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
