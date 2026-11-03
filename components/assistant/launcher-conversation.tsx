"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";

import { AssistantPanel } from "@/components/assistant/assistant-panel";
import { newChat } from "@/components/assistant/shared-chat";

// The Espace Espace window's own conversation, bound to the page it was
// opened from. The page is only a path: the server reads what it shows,
// with the user's session. Loaded when the window opens (with the AI SDK).
// Saved in the history like any other; « Nouvelle conversation » starts
// another one.
export default function LauncherConversation() {
  const page = usePathname();
  const [chat, setChat] = useState(() => newChat({ page }));
  return (
    <AssistantPanel
      chat={chat}
      onNew={() => setChat(newChat({ page }))}
      compact
      voiceFirst
    />
  );
}
