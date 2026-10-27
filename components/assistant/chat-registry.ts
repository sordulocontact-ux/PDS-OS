"use client";

import type { Chat } from "@ai-sdk/react";
import type { UIMessage } from "ai";

// Where the tab's PO conversation is kept (components/assistant/
// shared-chat.ts creates it). Types only from the AI SDK: the provider,
// in every page, reads it without loading the SDK.
let current: Chat<UIMessage> | null = null;

/** The tab's conversation, if one was started. */
export function keptChat(): Chat<UIMessage> | null {
  return current;
}

export function keepChat(chat: Chat<UIMessage> | null) {
  current = chat;
}
