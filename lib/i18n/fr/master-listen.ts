// The artist's listening on their page by project (proto `master-v2.html`,
// `master:v1`, rôle « mona »; docs/projet-complet/master.md § 11).

const labels = { mix: "Mix", mastering: "Master" } as const;

export const masterListen = {
  card: (stage: "mix" | "mastering", n: number, title: string) =>
    `Le ${labels[stage]} V${n} de « ${title} »`,
  empty: "Rien à écouter pour l'instant",
  emptyLine:
    "Rien à écouter pour l'instant : vous recevrez un message quand une version sera prête.",
  version: (stage: "mix" | "mastering", n: number, file: string) =>
    `${labels[stage]} V${n} · ${file}`,
  deposited: (by: string | null, day: string) =>
    by ? `Déposé par ${by} le ${day}` : `Déposé le ${day}`,
  intro: (validator: string | null) =>
    validator
      ? `Écoutez-le et dites ce que vous en pensez : ${validator} décide avec vos retours.`
      : "Écoutez-le et dites ce que vous en pensez : l'équipe décide avec vos retours.",
  yours: "Votre retour",
  timecode: "Minutage",
  timecodePlaceholder: "0:42",
  timecodeInvalid: "Écrivez le minutage comme « 0:42 » ou « 1:02:03 ».",
  feedback: "Votre retour",
  feedbackPlaceholder:
    "La voix est trop basse dans le refrain, on n'entend pas « néons ».",
  bodyMissing: "Écrivez votre retour.",
  send: "Envoyer mon retour",
  sent: "Retour envoyé",
  sentLine: (validator: string | null) =>
    `Merci. ${validator ?? "L'équipe"} le lira avant de décider.`,
  decided: "Cette version a déjà été décidée : rechargez la page.",
  failed: "Votre retour n'a pas pu être envoyé. Réessayez.",
  states: { todo: "À vous", done: "Avis envoyé" },
  todo: "Écouter et donner votre avis",
  // In the team: who left it.
  viaLink: (name: string) => `${name} (lien privé)`,
  offerTitle: "L'écoute de l'artiste",
} as const;
