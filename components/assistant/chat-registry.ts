"use client";

import type { Chat } from "@ai-sdk/react";
import type { UIMessage } from "ai";

// Where the tab's PO conversation is kept (components/assistant/
// shared-chat.ts creates it). Types only from the AI SDK: the provider,
// in every page, reads it without loading the SDK.
let current: Chat<UIMessage> | null = null;
const listeners = new Set<() => void>();

/** The tab's conversation, if one was started. */
export function keptChat(): Chat<UIMessage> | null {
  return current;
}

/** Another conversation becomes the tab's (a new one, one reopened from the
 * history): whoever shows it follows. */
export function keepChat(
  chat: Chat<UIMessage> | null,
  { silent = false }: { silent?: boolean } = {},
) {
  if (chat === current) return;
  current = chat;
  // Silent when the first conversation is created while rendering: nobody
  // showed another one yet.
  if (!silent) for (const listener of listeners) listener();
}

export function subscribeKeptChat(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
