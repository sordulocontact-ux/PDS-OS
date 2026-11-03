"use client";

import { useChat } from "@ai-sdk/react";
import { useRouter } from "next/navigation";

import {
  useAssistant,
  type PoOrigin,
} from "@/components/assistant/assistant-provider";
import {
  startSharedChat,
  useSharedChat,
} from "@/components/assistant/shared-chat";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/auth/redirects";

/**
 * « Parler à PO » from a page: a new conversation opens on the PO page with
 * the question already asked (docs/ASSISTANT.md § 2). The question is
 * written by code from what the page shows; PO answers from the project.
 * `origin`: the page and its trail, for « Retour » in the conversation.
 */
export function AskPoButton({
  question,
  label,
  size = "sm",
  variant = "ghost",
  origin,
}: {
  question: string;
  label: string;
  size?: "sm" | "lg";
  variant?: "ghost" | "outline";
  origin?: PoOrigin;
}) {
  const router = useRouter();
  const { setOrigin } = useAssistant();
  const { status } = useChat({ chat: useSharedChat() });
  const busy = status === "submitted" || status === "streaming";
  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      disabled={busy}
      onClick={() => {
        // A new conversation, saved apart from the one before.
        const chat = startSharedChat();
        setOrigin(origin ?? null);
        void chat.sendMessage({ text: question });
        router.push(routes.assistant);
      }}
    >
      {label}
    </Button>
  );
}
