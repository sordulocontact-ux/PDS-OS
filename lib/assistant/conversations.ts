import "server-only";

import type { UIMessage } from "ai";

import { conversationTitle } from "@/lib/assistant/conversation-title";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

/**
 * The history of the conversations with PO (docs/ASSISTANT.md § 2 ter):
 * one row per conversation, private to the person who had it (RLS), saved
 * by /api/assistant after every answer.
 */

export type ConversationSummary = { id: string; title: string; at: string };

export type SavedConversation = {
  id: string;
  title: string;
  messages: UIMessage[];
};

type Supabase = Awaited<ReturnType<typeof createClient>>;

// The latest conversations shown in the history.
const LIST_LIMIT = 100;

/** The turns as they can be shown and continued: a tool call cut short (the
 * answer stopped) has no result, would spin when reopened and be refused by
 * the model on the next question; it is left out, and a turn left empty
 * with it. */
function finishedTurns(messages: UIMessage[]): UIMessage[] {
  return messages.flatMap((message) => {
    const parts = message.parts.filter(
      (part) =>
        !("toolCallId" in part) ||
        part.state === "output-available" ||
        part.state === "output-error",
    );
    const shown = parts.some((part) => part.type !== "step-start");
    return shown ? [{ ...message, parts }] : [];
  });
}

/**
 * Saves the conversation's turns: its turns are replaced, or it is created
 * with its title and page on the first answer. Never throws: a history that
 * could not be written must not break the answer already given.
 */
export async function saveConversation(
  supabase: Supabase,
  input: {
    id: string;
    organizationId: string;
    pagePath: string | null;
    messages: UIMessage[];
  },
): Promise<void> {
  const turns = finishedTurns(input.messages);
  const messages = turns as unknown as Json;
  try {
    const { data, error } = await supabase
      .from("assistant_conversations")
      .update({ messages })
      .eq("id", input.id)
      .select("id");
    if (error) throw error;
    if (data.length > 0) return;

    const title = conversationTitle(turns);
    if (!title) return;
    const { error: insertError } = await supabase
      .from("assistant_conversations")
      .insert({
        id: input.id,
        organization_id: input.organizationId,
        title,
        page_path: input.pagePath?.startsWith("/app") ? input.pagePath : null,
        messages,
      });
    if (insertError) throw insertError;
  } catch (error) {
    console.error("assistant_conversation_not_saved", error);
  }
}

/** The viewer's latest conversations, newest first (RLS: their own only). */
export async function listConversations(
  personId: string,
): Promise<ConversationSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assistant_conversations")
    .select("id, title, updated_at")
    .eq("person_id", personId)
    .order("updated_at", { ascending: false })
    .limit(LIST_LIMIT);
  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    title: row.title,
    at: row.updated_at,
  }));
}

/** One of the viewer's conversations, or null (someone else's reads as none). */
export async function getConversation(
  id: string,
): Promise<SavedConversation | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assistant_conversations")
    .select("id, title, messages")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    title: data.title,
    messages: Array.isArray(data.messages)
      ? (data.messages as unknown as UIMessage[])
      : [],
  };
}
