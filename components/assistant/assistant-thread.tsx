"use client";

import type { ChatStatus, UIMessage } from "ai";
import { useEffect, useRef } from "react";

import { AssistantMessage } from "@/components/assistant/assistant-message";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

/** The turns of a PO conversation, kept scrolled to the latest one. */
export function AssistantThread({
  messages,
  status,
  error,
  className,
}: {
  messages: UIMessage[];
  status: ChatStatus;
  error: Error | undefined;
  className?: string;
}) {
  const t = fr.assistant;
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages, status]);

  return (
    <div
      className={cn("grid content-start gap-4", className)}
      aria-live="polite"
    >
      {messages.map((m) => (
        <AssistantMessage key={m.id} message={m} />
      ))}
      {status === "submitted" && (
        <p className="text-xs text-muted-foreground">{t.thinking}</p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {t.error}
        </p>
      )}
      <div ref={endRef} />
    </div>
  );
}
