import type { UIMessage } from "ai";

const TITLE_MAX = 120;

/** A conversation's title: its first question as asked, on one line, never
 * written by the model. Shared by the server (saved) and the history (the
 * conversation not saved yet). */
export function conversationTitle(messages: UIMessage[]): string | null {
  const first = messages.find((m) => m.role === "user");
  const text = (first?.parts ?? [])
    .map((p) => (p.type === "text" ? p.text : ""))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return null;
  return text.length > TITLE_MAX ? `${text.slice(0, TITLE_MAX - 1)}…` : text;
}
