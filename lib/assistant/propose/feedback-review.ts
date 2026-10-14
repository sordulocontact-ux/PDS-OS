import "server-only";

import { tool } from "ai";
import { z } from "zod";

import type {
  DraftChange,
  FeedbackReviewDraft,
  FeedbackTopicDraft,
} from "@/lib/assistant/drafts";
import { formatDay } from "@/lib/assistant/facts";
import { change } from "@/lib/assistant/propose/match";
import {
  proposalResult,
  type ProposeContext,
} from "@/lib/assistant/propose/result";
import { can } from "@/lib/auth/access";
import { routes } from "@/lib/auth/redirects";
import { loadFeedbackInbox } from "@/lib/feedback/queries";
import { proposeRewrite } from "@/lib/feedback/rewrite";
import {
  FEEDBACK_KINDS,
  TOPIC_SUMMARY_MAX,
  TOPIC_TITLE_MAX,
  type FeedbackPriority,
  type FeedbackTopic,
} from "@/lib/feedback/types";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";

/**
 * The director's feedback work through PO (read_feedback only): read the
 * topics, prepare an edit, prepare a decision. PO never decides: an edit
 * opens the real edit form pre-filled, a decision opens a confirmation, and
 * the director saves with their session (docs/ASSISTANT.md § 3 bis). A
 * priority is only kept when the user said it, never chosen by the model.
 */

const source = { label: fr.feedback.title, href: routes.feedback };
const STATUS = { new: "à examiner", sent: "transmis", dismissed: "écarté" };

// Words the user may say for each priority (checked in their own messages).
const PRIORITY_WORDS: Record<FeedbackPriority, RegExp> = {
  high: /\b(haute|elevee|urgent|urgente|prioritaire|critique|importante?)\b/,
  normal: /\b(normale?|moyenne?)\b/,
  low: /\b(basse|faible|pas urgent)\b/,
};

function saidPriority(quote: string | null): FeedbackPriority | null {
  if (!quote) return null;
  const folded = quote.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  // "pas urgent" is low, before "urgent" is read as high.
  if (PRIORITY_WORDS.low.test(folded)) return "low";
  if (PRIORITY_WORDS.high.test(folded)) return "high";
  if (PRIORITY_WORDS.normal.test(folded)) return "normal";
  return null;
}

async function findTopic(
  personId: string,
  topicId: string,
): Promise<FeedbackTopic | null> {
  const inbox = await loadFeedbackInbox(personId);
  return (
    [...inbox.topics.new, ...inbox.topics.sent, ...inbox.topics.dismissed].find(
      (topic) => topic.id === topicId,
    ) ?? null
  );
}

function topicFact(topic: FeedbackTopic): string {
  const priority = topic.priority
    ? `, priorité ${fr.feedback.priorities[topic.priority].toLowerCase()}`
    : "";
  return `Sujet « ${topic.title} » (${fr.feedback.kinds[topic.kind]}) : ${STATUS[topic.status]}${priority}, ${fr.feedback.count(topic.items.length)}, dernier le ${formatDay(topic.items[0].createdAt)}. Résumé : ${topic.summary}`;
}

export function feedbackReviewTools({ access, verbatim }: ProposeContext) {
  const allowed = () =>
    can(access, "read_feedback") && access.personId !== null;
  const forbidden = {
    facts: [fr.assistant.drafts.forbiddenFeedback],
    sources: [],
  };

  return {
    find_feedback: tool({
      description:
        "Retours de l'équipe sur l'application, regroupés en sujets par PO : à examiner, transmis (avec priorité), écartés. Renvoie topicId pour propose_feedback_edit et propose_feedback_review. Réservé au directeur général.",
      inputSchema: z.object({
        status: z
          .enum(["new", "sent", "dismissed", "all"])
          .default("all")
          .describe("new = à examiner, sent = transmis, dismissed = écartés"),
      }),
      execute: async ({ status }) => {
        if (!allowed()) return forbidden;
        const inbox = await loadFeedbackInbox(access.personId!);
        const topics =
          status === "all"
            ? [
                ...inbox.topics.new,
                ...inbox.topics.sent,
                ...inbox.topics.dismissed,
              ]
            : inbox.topics[status];
        const facts = topics.slice(0, 30).map(topicFact);
        if (inbox.unfiled.length > 0)
          facts.push(
            `${fr.feedback.count(inbox.unfiled.length)} en attente de tri : PO les regroupe à l'ouverture de la page Retours.`,
          );
        return {
          topics: topics.slice(0, 30).map((t) => ({
            topicId: t.id,
            title: t.title,
            status: t.status,
          })),
          facts: facts.length
            ? facts
            : ["Aucun retour de l'équipe pour l'instant."],
          sources: [source],
        };
      },
    }),

    propose_feedback_edit: tool({
      description:
        "Prépare la modification d'un sujet de retour avant sa transmission. Deux façons : rewrite = la demande de réécriture de l'utilisateur (« plus clair », « plus court », « pour les développeurs »), et l'application réécrit à partir des retours d'origine ; ou title / summary / kind quand l'utilisateur dicte lui-même le nouveau texte. Appeler find_feedback d'abord pour obtenir topicId. N'enregistre RIEN : le directeur relit le formulaire pré-rempli et enregistre.",
      inputSchema: z.object({
        topicId: z.uuid(),
        rewrite: z
          .string()
          .max(500)
          .optional()
          .describe("La demande de réécriture, avec les mots de l'utilisateur"),
        title: z
          .string()
          .max(TOPIC_TITLE_MAX)
          .optional()
          .describe("Seulement si l'utilisateur a dicté le titre"),
        summary: z
          .string()
          .max(TOPIC_SUMMARY_MAX)
          .optional()
          .describe("Seulement si l'utilisateur a dicté le résumé"),
        kind: z.enum(FEEDBACK_KINDS).optional(),
      }),
      execute: async ({ topicId, rewrite, title, summary, kind }) => {
        if (!allowed()) return forbidden;
        const t = fr.assistant.drafts;
        const topic = await findTopic(access.personId!, topicId);
        if (!topic) return { facts: [t.topicNotFound], sources: [source] };
        if (topic.status === "sent")
          return { facts: [t.topicSent(topic.title)], sources: [source] };

        // A rewrite is written from the original feedback (lib/feedback/
        // rewrite.ts), never from the model's own words in the chat.
        const warnings: string[] = [];
        let proposed = { title: title?.trim(), summary: summary?.trim() };
        if (rewrite !== undefined || (!title && !summary && !kind)) {
          const result = await proposeRewrite(
            await createClient(),
            topicId,
            rewrite?.trim() ?? "",
          );
          if (result.ok) proposed = result;
          else
            warnings.push(
              result.error === "quota" ? result.message : t.rewriteFailed,
            );
        }
        const values = {
          feedbackKind: kind ?? topic.kind,
          title: proposed.title || topic.title,
          summary: proposed.summary || topic.summary,
        };
        const draft: FeedbackTopicDraft = {
          kind: "feedbackTopic",
          topicId,
          values,
        };
        const changes: DraftChange[] = [];
        change(changes, t.labels.topicTitle, topic.title, values.title);
        change(changes, t.labels.summary, topic.summary, values.summary);
        change(
          changes,
          t.labels.feedbackKind,
          fr.feedback.kinds[topic.kind],
          fr.feedback.kinds[values.feedbackKind],
        );
        return proposalResult({
          draft,
          title: t.titles.editTopic(topic.title),
          changes,
          warnings,
          source,
        });
      },
    }),

    propose_feedback_review: tool({
      description:
        "Prépare une décision du directeur sur un sujet de retour : send = le transmettre à l'équipe qui construit l'outil (avec une priorité), prioritize = changer la priorité d'un sujet transmis, dismiss = l'écarter, reopen = remettre un sujet écarté à examiner. Appeler find_feedback d'abord. N'enregistre RIEN : le directeur confirme lui-même.",
      inputSchema: z.object({
        topicId: z.uuid(),
        action: z.enum(["send", "prioritize", "dismiss", "reopen"]),
        priorityQuote: z
          .string()
          .max(60)
          .optional()
          .describe(
            "Les mots exacts de l'utilisateur pour la priorité (« priorité haute », « urgent »…) ; absent s'il n'en a pas parlé",
          ),
      }),
      execute: async ({ topicId, action, priorityQuote }) => {
        if (!allowed()) return forbidden;
        const t = fr.assistant.drafts;
        const topic = await findTopic(access.personId!, topicId);
        if (!topic) return { facts: [t.topicNotFound], sources: [source] };

        const possible =
          (action === "send" && topic.status !== "sent") ||
          (action === "prioritize" && topic.status === "sent") ||
          (action === "dismiss" && topic.status === "new") ||
          (action === "reopen" && topic.status === "dismissed");
        if (!possible)
          return {
            facts: [t.invalidReview(topic.title, STATUS[topic.status])],
            sources: [source],
          };

        const needsPriority = action === "send" || action === "prioritize";
        const priority = needsPriority
          ? saidPriority(verbatim.quote(priorityQuote))
          : null;
        const draft: FeedbackReviewDraft = {
          kind: "feedbackReview",
          topicId,
          topicTitle: topic.title,
          action,
          priority,
        };
        const changes: DraftChange[] = [];
        if (priority)
          change(
            changes,
            t.labels.priority,
            topic.priority ? fr.feedback.priorities[topic.priority] : null,
            fr.feedback.priorities[priority],
          );
        return proposalResult({
          draft,
          title: t.titles.review[action](topic.title),
          changes,
          warnings: needsPriority && !priority ? [t.priorityToChoose] : [],
          source,
        });
      },
    }),
  };
}
