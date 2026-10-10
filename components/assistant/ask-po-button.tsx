"use client";

import { useChat } from "@ai-sdk/react";
import { useRouter } from "next/navigation";

import { useAssistant } from "@/components/assistant/assistant-provider";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/auth/redirects";

/**
 * « Parler à PO » from a page: a new conversation opens on the PO page with
 * the question already asked (docs/ASSISTANT.md § 2). The question is
 * written by code from what the page shows; PO answers from the project.
 */
export function AskPoButton({
  question,
  label,
  size = "sm",
  variant = "ghost",
}: {
  question: string;
  label: string;
  size?: "sm" | "lg";
  variant?: "ghost" | "outline";
}) {
  const router = useRouter();
  const { chat } = useAssistant();
  const { sendMessage, setMessages, status } = useChat({ chat });
  const busy = status === "submitted" || status === "streaming";
  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      disabled={busy}
      onClick={() => {
        setMessages([]);
        void sendMessage({ text: question });
        router.push(routes.assistant);
      }}
    >
      {label}
    </Button>
  );
}
