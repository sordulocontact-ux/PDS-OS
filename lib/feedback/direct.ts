import "server-only";

import { FEEDBACK_TRIAGE_INSTRUCTIONS } from "@/lib/ai/instructions/feedback-triage";
import { extract } from "@/lib/ai/llm";
import { feedbackTriageSchema } from "@/lib/ai/schemas/feedback-triage";
import { syncTopicToNotion, type NotionSync } from "@/lib/feedback/notion-sync";
import { fallbackTitle, triagePrompt } from "@/lib/feedback/triage";
import {
  plainText,
  TOPIC_SUMMARY_MAX,
  TOPIC_TITLE_MAX,
  type FeedbackPriority,
} from "@/lib/feedback/types";
import { fr } from "@/lib/i18n/fr";
import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

// PO writes the ticket's title and summary; a provider failure never keeps
// the feedback off Notion: the code then takes the first words.
async function topicText(feedback: { kind: string; message: string }) {
  try {
    const { output } = await extract(
      feedbackTriageSchema,
      triagePrompt(feedback, []),
      FEEDBACK_TRIAGE_INSTRUCTIONS,
    );
    return {
      title:
        plainText(output.title).slice(0, TOPIC_TITLE_MAX) ||
        fallbackTitle(feedback.message),
      summary:
        plainText(output.summary).slice(0, TOPIC_SUMMARY_MAX) ||
        feedback.message.slice(0, TOPIC_SUMMARY_MAX),
    };
  } catch (error) {
    console.error("sendDirectToNotion:", error);
    return {
      title: fallbackTitle(feedback.message),
      summary: feedback.message.slice(0, TOPIC_SUMMARY_MAX),
    };
  }
}

/**
 * The director's own feedback skips their inbox: it opens its own topic, sent
 * with the priority they chose, then published to Notion. Same SQL functions
 * and session as a topic sent from the feedback page (file_feedback,
 * review_feedback_topic, both checking read_feedback). If filing fails, the
 * feedback stays in the inbox, waiting to be sorted and sent by hand.
 */
export async function sendDirectToNotion(
  supabase: Supabase,
  feedback: { id: string; kind: string; message: string },
  priority: FeedbackPriority,
): Promise<NotionSync> {
  const { title, summary } = await topicText(feedback);
  const { data: topicId, error } = await supabase.rpc("file_feedback", {
    p_feedback: feedback.id,
    p_title: title,
    p_summary: summary,
  });
  const review = topicId
    ? await supabase.rpc("review_feedback_topic", {
        p_topic: topicId,
        p_action: "send",
        p_priority: priority,
      })
    : null;
  if (error || !topicId || review?.error) {
    console.error(
      "sendDirectToNotion:",
      error?.message ?? review?.error?.message,
    );
    return { status: "failed", reason: fr.feedback.notion.reasons.notFiled };
  }
  return syncTopicToNotion(supabase, topicId);
}
