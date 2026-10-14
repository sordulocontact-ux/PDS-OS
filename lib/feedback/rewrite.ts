import "server-only";

import { FEEDBACK_REWRITE_INSTRUCTIONS } from "@/lib/ai/instructions/feedback-rewrite";
import { extract } from "@/lib/ai/llm";
import {
  providerFailure,
  type ProviderFailure,
} from "@/lib/ai/provider-failure";
import { feedbackRewriteSchema } from "@/lib/ai/schemas/feedback-rewrite";
import {
  plainText,
  TOPIC_SUMMARY_MAX,
  TOPIC_TITLE_MAX,
} from "@/lib/feedback/types";
import type { createClient } from "@/lib/supabase/server";

const MAX_FEEDBACK = 40;

export type RewriteResult =
  | { ok: true; title: string; summary: string }
  | { ok: false; error: "not_found" | "provider" }
  | ProviderFailure;

/**
 * PO's proposal for a topic's title and summary, from its original feedback
 * and the director's optional request, read with the director's session.
 * Nothing is written: the director reviews it in the edit form and saves.
 */
export async function proposeRewrite(
  supabase: Awaited<ReturnType<typeof createClient>>,
  topicId: string,
  request: string,
): Promise<RewriteResult> {
  const [topicRes, feedbackRes] = await Promise.all([
    supabase
      .from("feedback_topics")
      .select("title, summary")
      .eq("id", topicId)
      .maybeSingle(),
    supabase
      .from("feedback")
      .select("kind, message, page_path")
      .eq("topic_id", topicId)
      .order("created_at", { ascending: false })
      .limit(MAX_FEEDBACK),
  ]);
  if (!topicRes.data || feedbackRes.error)
    return { ok: false, error: "not_found" };

  const input = [
    `<topic>\n<title>${topicRes.data.title}</title>\n<summary>${topicRes.data.summary}</summary>\n</topic>`,
    ...(feedbackRes.data ?? []).map(
      (f) =>
        `<feedback kind="${f.kind}"${f.page_path ? ` page="${f.page_path}"` : ""}>\n${f.message}\n</feedback>`,
    ),
    request ? `<request>\n${request}\n</request>` : "",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const { output } = await extract(
      feedbackRewriteSchema,
      input,
      FEEDBACK_REWRITE_INSTRUCTIONS,
    );
    const title = plainText(output.title).slice(0, TOPIC_TITLE_MAX);
    const summary = plainText(output.summary).slice(0, TOPIC_SUMMARY_MAX);
    if (!title || !summary) return { ok: false, error: "provider" };
    return { ok: true, title, summary };
  } catch (error) {
    console.error("proposeRewrite:", error);
    return providerFailure(error);
  }
}
