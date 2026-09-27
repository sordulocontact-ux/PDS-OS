import "server-only";

import { tool } from "ai";
import { z } from "zod";

import type { DraftChange, FeedbackDraft } from "@/lib/assistant/drafts";
import {
  proposalResult,
  type ProposeContext,
} from "@/lib/assistant/propose/result";
import { routes } from "@/lib/auth/redirects";
import {
  FEEDBACK_KINDS,
  FEEDBACK_MESSAGE_MAX,
  isAppPath,
} from "@/lib/feedback/types";
import { fr } from "@/lib/i18n/fr";

/**
 * propose_feedback: any member. PO drafts a feedback about the app (a bug,
 * an idea, a remark) from what the user said; the feedback window opens
 * pre-filled with it and the page PO was opened from, and the user sends it
 * (docs/ASSISTANT.md § 3 bis). Nothing is sent by PO.
 */
export function proposeFeedbackTool(
  context: ProposeContext & { pagePath: string | null },
) {
  return tool({
    description:
      "Prépare un retour sur l'application PDS OS elle-même (bug, idée d'amélioration, remarque sur l'interface), envoyé au directeur général. À utiliser quand l'utilisateur veut signaler ou suggérer quelque chose sur l'outil (« fais un retour », « signale que… », « je voudrais que ce bouton soit rouge »). N'envoie RIEN : l'utilisateur relit la fenêtre de retour pré-remplie et l'envoie lui-même.",
    inputSchema: z.object({
      kind: z
        .enum(FEEDBACK_KINDS)
        .optional()
        .describe(
          "bug = quelque chose ne marche pas ; idea = amélioration ou fonction qui manque ; other = question, remarque",
        ),
      message: z
        .string()
        .min(1)
        .max(FEEDBACK_MESSAGE_MAX)
        .describe(
          "Le retour avec les mots de l'utilisateur, à la première personne, sans aucune raison ni conséquence qu'il n'a pas dite. « je voudrais que le champ de l'accueil soit rouge » → « Je voudrais que le champ de saisie de l'accueil soit rouge. », jamais « …pour attirer l'attention ».",
        ),
    }),
    execute: async ({ kind, message }) => {
      const t = fr.assistant.drafts;
      const labels = t.labels;
      const pagePath =
        context.pagePath && isAppPath(context.pagePath)
          ? context.pagePath
          : null;
      // Shown on the card, so the kind sent without editing is never hidden.
      const feedbackKind = kind ?? "other";
      const draft: FeedbackDraft = {
        kind: "feedback",
        values: { feedbackKind, message: message.trim(), pagePath },
      };
      const changes: DraftChange[] = [
        {
          label: labels.feedbackKind,
          before: null,
          after: fr.feedback.kinds[feedbackKind],
        },
        { label: labels.message, before: null, after: draft.values.message },
        ...(pagePath
          ? [{ label: labels.page, before: null, after: pagePath }]
          : []),
      ];
      return proposalResult({
        draft,
        title: t.titles.feedback(fr.feedback.kinds[feedbackKind]),
        changes,
        warnings: [],
        source: { label: fr.feedback.title, href: routes.feedback },
      });
    },
  });
}
