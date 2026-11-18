import "server-only";

import { tool } from "ai";
import { z } from "zod";

import { assistantGaps } from "@/lib/i18n/fr/assistant-gaps";
import { assistantShow } from "@/lib/i18n/fr/assistant-show";

export const GAP_KINDS = Object.keys(assistantGaps.kinds) as [
  keyof typeof assistantGaps.kinds,
  ...(keyof typeof assistantGaps.kinds)[],
];
export type GapKind = (typeof GAP_KINDS)[number];

/**
 * « Je ne sais pas encore faire ça » (docs/ASSISTANT.md § 4 bis): PO says
 * what kind of request it could not fulfil, and the code counts it in
 * Notion with that kind, never with the question (lib/assistant/gaps.ts).
 * Replaces « Aucune fonction appelée », which counted every answer
 * without a function, a greeting or an explanation included.
 */
export function reportGapTool() {
  return tool({
    description:
      "À appeler, en plus de ta réponse, seulement quand tu ne peux pas faire ce que l'utilisateur demande parce que PDS OS ne te le permet pas encore (pas de fonction pour ça, donnée que l'application n'a pas). kind = ce qui était demandé : ecrire, traduire, graphique (un graphique ou un schéma que show_chart ne propose pas), fichier (un export ou un document que export_list et make_pdf ne proposent pas), document_joint (lire un PDF, un Excel, un Word joint), internet, envoyer (un mail, un message), agir_seul (planifier, automatiser, relancer tout seul), action_app (créer ou modifier quelque chose sans fonction propose_), donnee_absente, autre. Jamais pour une question à laquelle tu as répondu.",
    inputSchema: z.object({ kind: z.enum(GAP_KINDS) }),
    execute: async ({ kind }) => ({
      facts: [assistantShow.gaps.noted],
      sources: [],
      gap: "cannot" as const,
      kind,
    }),
  });
}
