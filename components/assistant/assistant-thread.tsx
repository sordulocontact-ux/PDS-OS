"use client";

import type { ChatStatus, UIMessage } from "ai";
import { IconLoader } from "nucleo-sharp-essential";
import { useEffect, useRef } from "react";

import { AssistantMessage } from "@/components/assistant/assistant-message";
import { Button } from "@/components/ui/button";
import { aiUsage } from "@/lib/i18n/fr/ai-usage";
import { assistant } from "@/lib/i18n/fr/assistant";
import { cn } from "@/lib/utils";

const fr = { aiUsage, assistant };

// The route answers 429 {"error":"quota","limit":n} when the member's
// requests of the day are used (lib/ai/quota.ts); the AI SDK puts that body
// in the error's message.
function quotaLimit(error: Error): number | null {
  try {
    const body: unknown = JSON.parse(error.message);
    if (
      body &&
      typeof body === "object" &&
      "error" in body &&
      body.error === "quota" &&
      "limit" in body &&
      typeof body.limit === "number"
    )
      return body.limit;
  } catch {
    // Not a JSON body: any other failure.
  }
  return null;
}

/** The turns of a PO conversation, kept scrolled to the latest one. A
 * failed answer offers `onRetry` (the same question asked again). */
export function AssistantThread({
  messages,
  status,
  error,
  onRetry,
  className,
}: {
  messages: UIMessage[];
  status: ChatStatus;
  error: Error | undefined;
  onRetry?: () => void;
  className?: string;
}) {
  const t = fr.assistant;
  const endRef = useRef<HTMLDivElement>(null);
  const reachedLimit = error ? quotaLimit(error) : null;

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages, status]);

  return (
    <div
      className={cn("grid content-start gap-4", className)}
      aria-live="polite"
    >
      {messages.map((m, i) => (
        <AssistantMessage
          key={m.id}
          message={m}
          live={status === "streaming" && i === messages.length - 1}
        />
      ))}
      {status === "submitted" && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <IconLoader
            aria-hidden
            className="size-3.5 animate-spin motion-reduce:animate-none"
          />
          {t.thinking}
        </p>
      )}
      {error && (
        <div className="flex flex-wrap items-center gap-3">
          <p role="alert" className="text-sm text-error">
            {reachedLimit === null
              ? t.error
              : fr.aiUsage.exceeded(reachedLimit)}
          </p>
          {reachedLimit === null && onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              {t.retry}
            </Button>
          )}
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}
