"use client";

import { Chat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useState, useSyncExternalStore } from "react";

import {
  keptChat,
  keepChat,
  subscribeKeptChat,
} from "@/components/assistant/chat-registry";

/**
 * A conversation with PO. Its id is a uuid: /api/assistant saves the turns
 * under it in the viewer's history (docs/ASSISTANT.md § 2 ter), so a new
 * conversation is always a new Chat, never an emptied one (which would
 * overwrite the saved one).
 */
export function newChat(
  options: { id?: string; messages?: UIMessage[]; page?: string } = {},
): Chat<UIMessage> {
  return new Chat<UIMessage>({
    id: options.id ?? crypto.randomUUID(),
    messages: options.messages,
    transport: new DefaultChatTransport({
      api: "/api/assistant",
      body: options.page ? { page: options.page } : undefined,
    }),
  });
}

/**
 * The tab's PO conversation (home, its page, « Demander à PO »): created on
 * first use, so the AI SDK loads with the first component that talks to
 * PO, never with every page (page loads audit, 27/10/2026).
 */
export function sharedChat(): Chat<UIMessage> {
  const kept = keptChat();
  if (kept) return kept;
  const chat = newChat();
  keepChat(chat, { silent: true });
  return chat;
}

/** Starts a new conversation for the tab and returns it. */
export function startSharedChat(): Chat<UIMessage> {
  const chat = newChat();
  keepChat(chat);
  return chat;
}

/** The tab's conversation, followed when another one takes its place. */
export function useSharedChat(): Chat<UIMessage> {
  return useSyncExternalStore(subscribeKeptChat, sharedChat, sharedChat);
}

/**
 * The conversation a page shows: the tab's, or `saved`, reopened from the
 * history, which then becomes the tab's (home's « Reprendre la
 * conversation » finds it, the next answer is saved under its id).
 */
export function useConversationChat(saved?: {
  id: string;
  messages: UIMessage[];
}): Chat<UIMessage> {
  const [opened] = useState(() => {
    if (!saved || keptChat()?.id === saved.id) return null;
    const chat = newChat({ id: saved.id, messages: saved.messages });
    // In the browser only: on the server, the module is shared by every
    // request. Silent: nobody else shows the tab's conversation here.
    if (typeof window !== "undefined") keepChat(chat, { silent: true });
    return chat;
  });
  const shared = useSharedChat();
  return typeof window === "undefined" && opened ? opened : shared;
}
