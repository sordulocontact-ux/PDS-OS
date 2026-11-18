/**
 * PO's unanswered questions in Notion (lib/assistant/gaps.ts): the words
 * of the database « Questions sans réponse de PO », option for option.
 */
export const assistantGaps = {
  causes: {
    cannot: "Pas encore possible",
    missing: "Information introuvable",
    failed: "Lecture en échec",
  },
  // What was asked, by kind (report_gap), never its text.
  kinds: {
    ecrire: "Écrire ou réécrire",
    traduire: "Traduire",
    graphique: "Graphique ou schéma",
    fichier: "Fichier ou export",
    document_joint: "Lire un document joint",
    internet: "Recherche sur Internet",
    envoyer: "Envoyer un message",
    agir_seul: "Agir seul ou planifier",
    action_app: "Créer ou modifier dans l'app",
    donnee_absente: "Donnée absente de PDS OS",
    autre: "Autre",
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
