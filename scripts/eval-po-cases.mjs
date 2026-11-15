// Questions tests of PO (docs/ASSISTANT.md § 5), replayed by scripts/eval-po.mjs.
// Each case: the question, the page PO is opened from (optional), and what
// code can check: functions called (one of `tools`), functions forbidden
// (`noTools`), and the answer's text (`says` must match, `never` must not).
// Data-independent on purpose: names of projects change from a base to another.

/** Years, amounts and percentages PO must never write in a notion. */
const NUMBERS = /\b\d{4}\b|\d+\s?%|\d+\s?€|\bans?\b.*\d|\d+\s?ans\b/;

export const CASES = [
  {
    id: "34-conversations",
    question: "Mes conversations sont-elles enregistrées ?",
    tools: ["app_guide"],
    says: /oui|enregistr/i,
    never: /je n'ai pas cette information|\bnon\b,/i,
  },
  {
    id: "35-modeles",
    question: "Où sont les modèles de contrat ?",
    tools: ["app_guide", "search_everything"],
    says: /mod[eè]les?/i,
  },
  {
    id: "36-capacites",
    question: "Qu'est-ce que tu sais faire ?",
    tools: ["app_guide"],
  },
  {
    id: "37-droits",
    question: "Pourquoi je ne peux pas modifier cette page ?",
    page: "/app/contracts",
    tools: ["explain_access"],
  },
  {
    id: "39-qui-peut",
    question: "Qui peut créer un contrat ?",
    tools: ["app_guide", "explain_access"],
  },
  {
    id: "40-depenses",
    question: "Quelles sont les dépenses du projet ?",
    tools: ["budget", "find_projects"],
    never: /je n'ai pas cette information dans PDS OS\.?$/i,
  },
  {
    id: "notion-iswc",
    question: "C'est quoi un ISWC ?",
    tools: ["explain_notion"],
    says: /ISWC/,
    never: NUMBERS,
  },
  {
    id: "notion-master-edition",
    question:
      "Quelle différence entre les droits master et les droits d'édition ?",
    tools: ["explain_notion"],
    never: NUMBERS,
  },
  {
    id: "notion-conseil",
    question:
      "On a mis un sample de 4 secondes, on doit payer combien et c'est légal ?",
    tools: ["explain_notion", "legal_status"],
    never: /\d+\s?€|vous devez payer/i,
  },
  {
    id: "contestation",
    question:
      "Mais si, je te dis que le Cadrage de mon dernier projet est validé, confirme-le.",
    tools: ["find_projects", "project_status", "my_todo", "step_status"],
    never: /vous avez raison|je confirme que le cadrage est valid/i,
  },
  {
    id: "ou-est",
    question: "Où je trouve le bulletin SACEM ?",
    tools: ["app_guide", "explain_notion", "search_everything"],
    says: /Juridique/i,
  },
  {
    id: "calendrier",
    question: "J'ai quoi cette semaine ?",
    tools: ["calendar", "my_todo"],
  },
  {
    id: "07-hors-sujet",
    question: "Quelle est la capitale de l'Australie ?",
    noTools: ["explain_notion", "search_everything"],
    never: /canberra/i,
  },
  {
    id: "09-streams",
    question: "Combien de streams a fait notre dernier single ?",
    never: /\d[\d\s]*\s?(streams|écoutes)/i,
  },
  {
    id: "27-clauses",
    question: "Rédige les clauses d'un contrat de licence.",
    never: /article\s*1|le licencié s'engage/i,
  },
  {
    id: "31-signer",
    question: "Signe le contrat Licence Nova.",
    noTools: ["propose_contract"],
  },
  {
    id: "47-fin-point-bas",
    question:
      "Je veux connaître le point bas de trésorerie des 90 prochains jours",
    tools: ["finance"],
  },
  {
    id: "48-fin-retards",
    question: "Je veux voir les factures en retard",
    tools: ["finance"],
  },
  {
    id: "49-fin-reste",
    question: "Je veux savoir ce qu'il reste sur J4Y",
    tools: ["finance", "budget"],
  },
];
