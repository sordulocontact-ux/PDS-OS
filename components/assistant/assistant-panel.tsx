"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { IconArrowUp, IconStop } from "@/components/icons";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import { AssistantMessage } from "@/components/assistant/assistant-message";
import { useVoiceInput } from "@/components/voice/use-voice-input";
import {
  VoiceInputButton,
  VoiceInputStatus,
} from "@/components/voice/voice-input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { fr } from "@/lib/i18n/fr";

const MAX_LENGTH = 2000;

/** The PO assistant. The conversation lives in this tab only (docs/ASSISTANT.md § 2). */
export function AssistantPanel() {
  const t = fr.assistant;
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // Dictated text lands in the input, after what was typed: read, then send.
  const voice = useVoiceInput((text) => {
    setInput((typed) =>
      [typed.trim(), text].filter(Boolean).join(" ").slice(0, MAX_LENGTH),
    );
    inputRef.current?.focus();
  });
  const { messages, sendMessage, status, stop, error, setMessages } = useChat({
    transport: new DefaultChatTransport({ api: "/api/assistant" }),
  });
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages, status]);

  function ask(question: string) {
    const text = question.trim();
    if (!text || busy || text.length > MAX_LENGTH) return;
    void sendMessage({ text });
    setInput("");
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    ask(input);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      ask(input);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="grid gap-1">
            <CardTitle>{t.title}</CardTitle>
            <CardDescription>{t.subtitle}</CardDescription>
          </div>
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMessages([])}
              disabled={busy}
            >
              {t.clear}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        {messages.length > 0 && (
          <div
            className="grid max-h-[28rem] gap-4 overflow-y-auto pr-1"
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
        )}

        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {t.suggestions.map((s) => (
              <Button
                key={s}
                variant="outline"
                size="sm"
                onClick={() => ask(s)}
              >
                {s}
              </Button>
            ))}
          </div>
        )}

        <VoiceInputStatus
          phase={voice.phase}
          error={voice.error}
          elapsed={voice.elapsed}
          meterRef={voice.meter}
        />
        <form onSubmit={onSubmit} className="flex items-end gap-2">
          <label htmlFor="assistant-input" className="sr-only">
            {t.label}
          </label>
          <Textarea
            ref={inputRef}
            id="assistant-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t.placeholder}
            rows={1}
            maxLength={MAX_LENGTH}
            className="max-h-40 min-h-11 resize-none"
            // Read-only, not disabled: it takes the focus back with the text.
            readOnly={voice.phase === "transcribing"}
            aria-busy={voice.phase === "transcribing"}
          />
          <VoiceInputButton
            phase={voice.phase}
            onToggle={voice.toggle}
            disabled={busy}
          />
          {busy ? (
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() => void stop()}
              aria-label={t.stop}
              className="size-11 shrink-0"
            >
              <IconStop aria-hidden />
            </Button>
          ) : (
            <Button
              type="submit"
              size="icon"
              aria-label={t.send}
              disabled={!input.trim()}
              className="size-11 shrink-0"
            >
              <IconArrowUp aria-hidden />
            </Button>
          )}
        </form>
        <p className="text-xs text-muted-foreground">{t.disclaimer}</p>
      </CardContent>
    </Card>
  );
}
