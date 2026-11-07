/**
 * PO's unanswered questions in Notion (lib/assistant/gaps.ts): the words
 * of the database « Questions sans réponse de PO », option for option.
 */
export const assistantGaps = {
  causes: {
    none: "Aucune fonction appelée",
    missing: "Information introuvable",
    failed: "Lecture en échec",
  },
  environments: {
    production: "Production",
    preprod: "Pré-prod",
    local: "Local",
  },
  title: (cause: string, part: string | null) =>
    part ? `${cause} · ${part}` : cause,
  noTool: "aucune",
};
