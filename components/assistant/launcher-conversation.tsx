"use client";

import { Chat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { AssistantPanel } from "@/components/assistant/assistant-panel";

// The Espace Espace window's own conversation, bound to the page it was
// opened from. The page is only a path: the server reads what it shows,
// with the user's session. Loaded when the window opens (with the AI SDK).
export default function LauncherConversation() {
  const page = usePathname();
  const [chat] = useState(
    () =>
      new Chat<UIMessage>({
        transport: new DefaultChatTransport({
          api: "/api/assistant",
          body: { page },
        }),
      }),
  );
  return <AssistantPanel chat={chat} compact voiceFirst />;
}
