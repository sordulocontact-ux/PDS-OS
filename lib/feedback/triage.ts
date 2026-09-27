import "server-only";

import { FEEDBACK_TRIAGE_INSTRUCTIONS } from "@/lib/ai/instructions/feedback-triage";
import { extract } from "@/lib/ai/llm";
import { feedbackTriageSchema } from "@/lib/ai/schemas/feedback-triage";
import {
  plainText,
  TOPIC_SUMMARY_MAX as SUMMARY_MAX,
  TOPIC_TITLE_MAX as TITLE_MAX,
} from "@/lib/feedback/types";
import type { createClient } from "@/lib/supabase/server";

// Feedback filed per run, oldest first; the rest waits for the next visit.
const MAX_PER_RUN = 20;
// Topics shown to the model: the most recently fed ones.
const MAX_TOPICS = 100;

type Topic = { id: string; kind: string; title: string; summary: string };

// Title of a new topic when the model gives none: the first words, by code.
function fallbackTitle(message: string): string {
  const words = message.trim().split(/\s+/).slice(0, 8).join(" ");
  return words.length > 80 ? `${words.slice(0, 79)}…` : words;
}

function prompt(
  feedback: { kind: string; message: string },
  topics: Array<Topic & { ref: string }>,
): string {
  const topicTags = topics.map(
    (t) =>
      `<topic id="${t.ref}" kind="${t.kind}">\n<title>${t.title}</title>\n<summary>${t.summary}</summary>\n</topic>`,
  );
  return [
    `<new_feedback kind="${feedback.kind}">\n${feedback.message}\n</new_feedback>`,
    ...topicTags,
  ].join("\n");
}

export type TriageResult = { ok: boolean; filed: number };

/**
 * Files every feedback still waiting into a topic, with the director's own
 * session (file_feedback checks read_feedback). PO only proposes: the topic
 * it names must be one of the ids it was given (short refs mapped back by
 * code), otherwise a new topic is opened. The feedback itself is never
 * changed. Stops at the first provider or database failure; what is left
 * stays waiting and is shown as such.
 */
export async function triageUnfiledFeedback(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
): Promise<TriageResult> {
  const [unfiledRes, topicsRes] = await Promise.all([
    supabase
      .from("feedback")
      .select("id, kind, message")
      .eq("organization_id", organizationId)
      .is("topic_id", null)
      .order("created_at")
      .limit(MAX_PER_RUN),
    supabase
      .from("feedback_topics")
      .select("id, kind, title, summary")
      .eq("organization_id", organizationId)
      .order("updated_at", { ascending: false })
      .limit(MAX_TOPICS),
  ]);
  if (unfiledRes.error || topicsRes.error) {
    console.error(
      "triageUnfiledFeedback:",
      unfiledRes.error?.message ?? topicsRes.error?.message,
    );
    return { ok: false, filed: 0 };
  }

  // Kept up to date as topics open or change, for the next feedback.
  const topics: Topic[] = topicsRes.data ?? [];
  let filed = 0;

  for (const feedback of unfiledRes.data ?? []) {
    const refs = topics.map((t, i) => ({ ...t, ref: `t${i + 1}` }));
    let output;
    try {
      ({ output } = await extract(
        feedbackTriageSchema,
        prompt(feedback, refs),
        FEEDBACK_TRIAGE_INSTRUCTIONS,
      ));
    } catch (error) {
      console.error("triageUnfiledFeedback:", error);
      return { ok: false, filed };
    }

    const match = refs.find((t) => t.ref === output.topic.trim());
    const summary = plainText(output.summary).slice(0, SUMMARY_MAX);
    const title =
      plainText(output.title).slice(0, TITLE_MAX) ||
      fallbackTitle(feedback.message);

    const newSummary = summary || feedback.message.slice(0, SUMMARY_MAX);
    const { data: topicId, error } = await supabase.rpc("file_feedback", {
      p_feedback: feedback.id,
      p_topic: match?.id,
      p_title: title,
      p_summary: match ? summary || undefined : newSummary,
    });
    if (error || !topicId) {
      console.error("triageUnfiledFeedback:", error?.message);
      return { ok: false, filed };
    }

    // The topic just fed moves first, as in the database (updated_at).
    const index = topics.findIndex((t) => t.id === topicId);
    const topic =
      index >= 0
        ? topics.splice(index, 1)[0]
        : { id: topicId, kind: feedback.kind, title, summary: newSummary };
    if (match && summary) topic.summary = summary;
    topics.unshift(topic);
    filed += 1;
  }
  return { ok: true, filed };
}
