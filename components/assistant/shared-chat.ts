"use client";

import { Chat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";

import { keptChat, keepChat } from "@/components/assistant/chat-registry";

/**
 * The tab's PO conversation (home, its page, « Demander à PO »): created on
 * first use, so the AI SDK loads with the first component that talks to
 * PO, never with every page (page loads audit, 27/10/2026).
 */
export function sharedChat(): Chat<UIMessage> {
  const kept = keptChat();
  if (kept) return kept;
  const chat = new Chat<UIMessage>({
    transport: new DefaultChatTransport({ api: "/api/assistant" }),
  });
  keepChat(chat);
  return chat;
}
