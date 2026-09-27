/** Dictation: fill or edit a stage form by voice, common to every stage. */
export const voice = {
  start: "Dicter",
  unsupported: "La dictée nécessite un micro et un navigateur récent.",
  requesting: "Autorisation du micro…",
  recording: "Je vous écoute",
  hint: "Dites ce qu'il faut remplir ou changer, par exemple : « l'objectif, c'est… », « ajoute un besoin de clip ».",
  limit: (clock: string) => `sur ${clock}`,
  level: "Niveau du micro",
  finish: "Terminer",
  cancel: "Annuler",
  sending: "PO analyse la dictée…",
  heard: "Entendu",
  reviewTitle: "Propositions de PO",
  reviewHint:
    "Rien n'est enregistré avant « Appliquer ». Écartez ce qui ne convient pas.",
  before: "Avant",
  after: "Après",
  keep: "Retenir",
  drop: "Écarter",
  missing:
    "Introuvable dans la dictée : probablement inventé. Écarté par défaut.",
  apply: (count: number) =>
    count > 1 ? `Appliquer les ${count} changements` : "Appliquer",
  applying: "Enregistrement…",
  discard: "Tout abandonner",
  retry: "Dicter à nouveau",
  /** Voice typing in a text input (the assistant). */
  input: {
    start: "Dicter votre question",
    stop: "Valider la dictée",
    cancel: "Annuler la dictée",
    listening: "Écoute en cours…",
    transcribing: "Transcription…",
  },
  errors: {
    unauthorized: "Votre session a expiré. Reconnectez-vous.",
    forbidden: "Seul le chef de projet responsable peut dicter sur ce projet.",
    invalid_input: "L'enregistrement n'a pas pu être envoyé. Réessayez.",
    not_found: "Projet introuvable.",
    audio_too_large: "La dictée est trop longue. Faites plus court.",
    nothing_heard: "Aucune parole détectée. Vérifiez le micro et réessayez.",
    nothing_understood:
      "PO n'a trouvé aucun changement à proposer dans ce qui a été dit.",
    provider_quota:
      "Le service de transcription est saturé. Réessayez dans une minute.",
    provider_error: "Le service n'a pas répondu. Réessayez.",
    permission_denied:
      "Le micro est bloqué. Autorisez-le dans la barre d'adresse, puis réessayez.",
    device_error: "Aucun micro utilisable n'a été trouvé.",
    unsupported: "La dictée nécessite un micro et un navigateur récent.",
    no_tab_audio: "Le micro n'a pas pu être ouvert.",
    too_large: "La dictée est trop longue. Faites plus court.",
  },
} as const;
