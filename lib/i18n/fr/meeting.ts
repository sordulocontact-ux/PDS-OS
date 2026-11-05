/**
 * A held meeting in its step (components/calls/meeting/): its facts, its
 * report filed by agenda point, and the summary sent to the participants.
 * Words of the proto « Projet complet » (docs/protos/src/mk.js `crData`,
 * `crLine`, `crModal`, `sumDraft`, `summaryBlock`, `summaryFor`).
 */
export const meeting = {
  // The section of a call's page that holds them.
  section: "La réunion",
  // MeetingFacts.
  report: "Compte rendu",
  readReport: "Lire le compte rendu",
  noReport:
    "Le compte rendu arrive après l'enregistrement et sa transcription.",
  facts: (when: string, format: string | null, people: string) =>
    [when, format, people].filter(Boolean).join(" · "),
  // MeetingReportDialog.
  title: (name: string) => `Compte rendu · ${name}`,
  close: "Fermer",
  date: "Date",
  format: "Format",
  formatValue: (format: string | null, minutes: number | null) =>
    [format, minutes ? `${minutes} min` : null].filter(Boolean).join(" · ") ||
    "—",
  participants: "Participants",
  participantOf: (fn: string | null, name: string) =>
    fn ? `${fn} : ${name}` : name,
  agenda: "Ordre du jour",
  source: "Source",
  sourceValue: "Enregistré dans PDS OS, transcrit, puis rangé par PO",
  nothingSaid: "Rien n'a été dit sur ce point.",
  loose: "Dit en dehors de l'ordre du jour",
  looseEmpty: "Rien d'autre n'a été dit.",
  added: "Ajouté après la réunion",
  footer:
    "Les phrases sont citées telles quelles. Ce qui fait foi, ce sont les décisions confirmées dans l'étape.",
  kinds: {
    decision: "Décision",
    hypothesis: "Hypothèse",
    action: "Action proposée",
    arbitrate: "Point à arbitrer",
  },
  forDate: (day: string) => `pour le ${day}`,
  became: (text: string) => `Devenu : « ${text} »`,
  quote: (text: string) => `« ${text} »`,
  states: {
    confirmed: (name: string) => `Confirmé par ${name}`,
    corrected: (name: string) => `Corrigé et confirmé par ${name}`,
    discarded: (name: string) => `Écarté par ${name}`,
    pending: "À confirmer",
  },
  // MeetingSummaryBlock.
  summary: {
    heading: "Résumé pour les participants",
    headingVersion: (n: number) =>
      `Résumé pour les participants · version ${n}`,
    note: "Préparé par PO à partir de ce qui a été tranché, sans les phrases citées ni ce qui a été écarté. Relisez et corrigez avant d'envoyer.",
    message: "Message",
    messageMissing: "Écrivez le message à envoyer.",
    recipients: "Destinataires",
    recipientsNone:
      "Personne à qui l'envoyer : le call n'a pas d'autre participant.",
    teamOnly: "L'équipe le reçoit dans PDS OS.",
    howList: (list: string) => `${list} ; l'équipe dans PDS OS.`,
    howOf: (name: string, how: string) => `${name} ${how}`,
    how: {
      email: "par e-mail",
      link: "sur son lien privé",
    },
    send: "Envoyer aux participants",
    sending: "Envoi…",
    cancel: "Annuler",
    sent: "Résumé envoyé aux participants",
    sentBadge: (n: number) => `Envoyé · version ${n}`,
    sentBy: (name: string, day: string, count: number, older: boolean) =>
      `Envoyé par ${name} le ${day} à ${count} participant${count > 1 ? "s" : ""}${older ? " · versions précédentes gardées" : ""}.`,
    correct: "Corriger et renvoyer",
    done: "Résumé envoyé",
    // PDS OS e-mails the outside guests itself when it has their address.
    emailNotWired:
      "Résumé envoyé dans PDS OS, mais pas par e-mail aux invités extérieurs : copiez le message pour eux.",
    // The outside guests PDS OS e-mailed, by name.
    emailPartial: (names: string[]) =>
      `Résumé envoyé dans PDS OS et par e-mail à ${names.join(", ")} ; pour les autres, copiez le message.`,
    emailSent: (names: string[]) =>
      `Résumé envoyé dans PDS OS et par e-mail à ${names.join(", ")}`,
    emailSubject: (project: string, call: string) =>
      project === call
        ? `« ${project} » : résumé`
        : `« ${project} » : résumé de « ${call} »`,
    waiting: (name: string) =>
      `En attente de ${name} : envoyer le résumé de la réunion`,
    failed: "Le résumé n'a pas pu être envoyé. Réessayez.",
    forbidden: "Seul le responsable du call envoie le résumé.",
    // The draft written by the code (never by the model).
    draft: {
      hello: "Bonjour à tous,",
      thanks: (kind: "exchange" | "call", day: string) =>
        `Merci pour ${kind === "exchange" ? "l'échange" : "le call"} du ${day}. Voici ce qui a été décidé.`,
      decisions: "Décisions :",
      toConfirm: "À confirmer :",
      next: "Prochaines étapes :",
      line: (text: string) => `— ${text}`,
      topicLine: (topic: string, text: string) => `${topic} : ${text}`,
      actionLine: (text: string, who: string | null, due: string | null) =>
        `${text} · ${who ?? "à attribuer"}${due ? `, pour le ${due}` : ""}`,
    },
  },
  // MeetingSummaryFor (a participant's view).
  summaryFor: {
    heading: "Résumé de la réunion",
    sentBy: (name: string, day: string, version: number) =>
      `Envoyé par ${name} le ${day}${version > 1 ? ` · version ${version}` : ""}.`,
  },
} as const;
