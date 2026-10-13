/** The vocabulary of the Conception's elements (MKT-C2-09). */
export const conceptionKinds = {
  guideTitle: "Ce que l'on range ici",
  types: {
    reference: "Référence",
    moodboard: "Moodboard",
    to_qualify: "À qualifier",
  },
  definitions: {
    reference:
      "Une source d'inspiration : on s'en nourrit, on ne la livre pas.",
    moodboard:
      "Une sélection organisée de références, avec l'intention qu'elle exprime.",
    proposal:
      "Une proposition créative concrétise un concept (rough, maquette, storyboard) : elle se soumet en Conception, relue par le chef de projet.",
    workVersion:
      "Une version de travail matérialise le livrable en cours de réalisation : elle se dépose en Production.",
    to_qualify:
      "Ajouté avant ce classement : dites si c'est une référence ou un moodboard.",
  },
  proposalTitle: "Proposition créative",
  workVersionTitle: "Version de travail",
  // Examples by the deliverable's format.
  examples: {
    clip: {
      reference: "un plan d'un autre clip, une lumière de film",
      moodboard: "une planche de lieux et de cadrages",
    },
    cover: {
      reference: "une pochette, une typographie, une photo",
      moodboard: "une planche de couleurs et de matières",
    },
    short: {
      reference: "un TikTok tendance, un son repris",
      moodboard: "une sélection de formats verticaux qui marchent",
    },
    campaign: {
      reference: "une affiche, une campagne d'une autre marque",
      moodboard: "une planche des déclinaisons visuelles",
    },
    other: {
      reference: "une image, une vidéo, un lien qui inspire",
      moodboard: "une planche Are.na, Pinterest ou un PDF",
    },
  },
  example: (text: string) => `Par exemple : ${text}.`,
  usages: {
    inspiration: "Inspiration seulement",
    free: "Libre d'utilisation",
    licensed: "Licence acquise",
    to_license: "Licence à acquérir",
    owned: "Appartient au projet",
  },
  usageLabel: "Droits et usage",
  typeLabel: "Type",
  moodboardLabel: "Dans le moodboard",
  noMoodboard: "Aucun",
  inMoodboard: (name: string) => `Dans « ${name} »`,
  moodboardCount: (n: number) => (n === 1 ? "1 référence" : `${n} références`),
  noReview:
    "Une référence n'est relue par personne seule : elle entre dans la direction quand une section qui la contient est validée.",
  attached: (labels: string) => `Rattachée à : ${labels}.`,
  unattached:
    "Rattachée à rien pour l'instant : elle apparaît dans « À rattacher ».",
};
