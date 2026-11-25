// « Demander des fichiers » in a collective's Master (lot 9 bis of
// docs/pds-mic-plan.md): the owner asks a member of the team for the source
// of several titles; one line per title, received by its first audio file.
// « de » elides before a vowel: « Ouvrir le deal d'Iris Moon ».
const de = (name: string) =>
  /^[aeiouyàâéèêëîïôûüh]/i.test(name) ? `d'${name}` : `de ${name}`;

export const masterFileRequests = {
  button: "Demander des fichiers",
  title: "Demander des fichiers",
  description:
    "Choisissez les titres et la personne qui a leurs fichiers. Elle est prévenue et dépose la source de chaque titre depuis PDS OS ; chaque titre est marqué reçu dès qu'un fichier audio arrive sur lui.",
  titles: "Titres",
  titleAsked: (label: string, name: string) => `${label} (demandé à ${name})`,
  picked: (labels: string[]) =>
    labels.length === 0
      ? "Aucun titre choisi."
      : `${labels.length} titre${labels.length > 1 ? "s" : ""} : ${labels.join(", ")}.`,
  person: "À qui",
  personPlaceholder: "Choisir une personne",
  reasons: {
    team: "Équipe du projet",
    engineer: "Ingénieur du Master",
    direction: "Direction",
  } as Record<string, string>,
  note: "Message (facultatif)",
  notePlaceholder: "Ex. les prises de la session de mardi",
  submit: "Envoyer la demande",
  done: (name: string, count: number) =>
    count === 0
      ? `Ces titres étaient déjà demandés à ${name}.`
      : `Demande envoyée à ${name} : ${count} titre${count > 1 ? "s" : ""}.`,
  noRecipient:
    "Personne d'autre ne travaille sur ce projet : ajoutez quelqu'un à l'équipe (Cadrage › Équipe) pour lui demander des fichiers.",
  // The line of a title, on the Source step.
  askedOf: (name: string, date: string) =>
    `Fichiers demandés à ${name} le ${date}`,
  askedBy: (name: string, date: string) => `Demandé par ${name} le ${date}`,
  cancel: "Annuler la demande",
  cancelLabel: (title: string) => `Annuler la demande de fichiers ${de(title)}`,
  cancelled: "Demande annulée.",
  // The person asked: their lines, all titles together.
  mine: "Fichiers qui vous sont demandés",
  mineHint:
    "Déposez la source de chaque titre : elle arrive au Catalogue sur ce titre seulement, et la demande est marquée reçue.",
  deposit: "Déposer le fichier",
  depositLabel: (title: string) => `Déposer le fichier ${de(title)}`,
  depositTitle: (title: string) => `Déposer le fichier ${de(title)}`,
  depositDescription:
    "Le fichier devient une version audio de ce titre au Catalogue. Choisissez ce que c'est, puis confirmez l'envoi.",
  audioState: "Ce fichier est",
  audioStates: { rough_mix: "Une mise à plat", demo: "Une maquette" },
  dropLabel: "Fichier audio",
  dropHint: "Glissez le fichier ici, ou cliquez pour le choisir.",
  confirmHint:
    "Écoutez-le si besoin : c'est exactement ce fichier qui arrivera au Catalogue sur ce titre.",
  received: (title: string) =>
    `Fichier déposé pour ${title} : la demande est marquée reçue.`,
  errors: {
    titlesRequired: "Choisissez au moins un titre.",
    personRequired: "Choisissez la personne à qui demander les fichiers.",
    recipient_not_allowed:
      "Cette personne ne travaille pas sur ce projet : choisissez quelqu'un de l'équipe ou de la direction.",
    title_abandoned:
      "Un des titres choisis est abandonné : retirez-le de la demande.",
    title_not_in_master:
      "Un des titres choisis n'est pas encore au Catalogue : déposez d'abord un audio depuis « Titres ».",
    title_not_found: "Un des titres choisis ne fait plus partie du projet.",
    request_closed:
      "Cette demande est déjà close (fichier reçu ou demande annulée) : rechargez la page.",
    note_too_long: "Le message dépasse 1 000 caractères.",
    failed: "La demande n'a pas pu être enregistrée. Réessayez.",
    depositFailed: "Le fichier n'a pas pu être déposé. Réessayez.",
  } as Record<string, string>,
} as const;
