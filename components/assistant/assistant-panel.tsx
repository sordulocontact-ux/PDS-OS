"use client";

import { useChat, type Chat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { IconArrowUp, IconStop } from "@/components/icons";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import { AssistantMessage } from "@/components/assistant/assistant-message";
import { useAssistant } from "@/components/assistant/assistant-provider";
import { useVoiceInput } from "@/components/voice/use-voice-input";
import {
  VoiceInputBar,
  VoiceInputButton,
  VoiceInputStatus,
} from "@/components/voice/voice-input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

const MAX_LENGTH = 2000;

/**
 * The PO assistant (Figma "Desktop - 11"): suggestions, then a tinted input
 * with the microphone and send buttons. The conversation lives in this tab
 * only (docs/ASSISTANT.md § 2). On the home page it is the tab's shared one;
 * the Espace Espace window passes its own `chat` (a new conversation), is
 * `compact`, and talks: it listens at once and sends what was dictated
 * (`voiceFirst`).
 */
export function AssistantPanel({
  chat: ownChat,
  compact = false,
  voiceFirst = false,
}: {
  chat?: Chat<UIMessage>;
  compact?: boolean;
  voiceFirst?: boolean;
}) {
  const t = fr.assistant;
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // Dictated text joins what was typed. Home: it lands in the input, read,
  // then sent. Espace Espace window: it is sent at once, as a spoken turn.
  const voice = useVoiceInput((text) => {
    const joined = [inputRef.current?.value.trim(), text]
      .filter(Boolean)
      .join(" ")
      .slice(0, MAX_LENGTH);
    if (voiceFirst) {
      ask(joined);
      return;
    }
    setInput(joined);
    inputRef.current?.focus();
  });
  const { chat: sharedChat } = useAssistant();
  const { messages, sendMessage, status, stop, error, setMessages } = useChat({
    chat: ownChat ?? sharedChat,
  });
  const busy = status === "submitted" || status === "streaming";
  // Listening: cancel and validate replace the microphone and send buttons.
  const listening = voice.phase === "requesting" || voice.phase === "recording";

  // Opened to talk: listening starts with the window, once.
  const listened = useRef(false);
  useEffect(() => {
    if (!voiceFirst || listened.current) return;
    listened.current = true;
    voice.toggle();
    // The voice helpers change identity on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceFirst]);

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
    // Send stays enabled as in the Figma: with nothing typed, back to the input.
    if (!input.trim()) inputRef.current?.focus();
    ask(input);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      // While dictating, Enter ends the dictation: the text is read first.
      if (voice.phase === "recording") voice.toggle();
      else ask(input);
    }
  };

  return (
    <section aria-label={t.title} className="flex flex-col gap-3">
      {messages.length > 0 && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMessages([])}
            disabled={busy}
            className="self-end"
          >
            {t.clear}
          </Button>
          <div
            className={cn(
              "grid gap-4 overflow-y-auto pr-1",
              compact ? "max-h-[45dvh]" : "max-h-[28rem]",
            )}
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
        </>
      )}

      {messages.length === 0 && (
        <div className="flex flex-wrap justify-center gap-2 md:gap-5">
          {t.suggestions.map((s) => (
            <Button
              key={s}
              // Window (glass): filled pills; home: outlined pills.
              variant={compact ? "secondary" : "outline"}
              onClick={() => ask(s)}
              className={cn(
                "h-auto py-3 font-medium text-secondary-foreground",
                // Window: wider pills, more room inside (demande de Sacha).
                compact ? "px-5" : "bg-transparent px-3",
              )}
            >
              {s}
            </Button>
          ))}
        </div>
      )}

      <VoiceInputStatus phase={voice.phase} error={voice.error} />
      <form
        onSubmit={onSubmit}
        className={cn(
          "flex flex-col gap-4 rounded-2xl border border-transparent bg-[var(--surface-tint)] p-6 transition-[border-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] has-[textarea:focus-visible]:border-[color:var(--border-strong)]",
          compact ? "min-h-32" : "min-h-51",
        )}
      >
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
          className="max-h-60 min-h-0 grow resize-none rounded-none border-0 p-0 text-base font-medium focus-visible:ring-0 md:text-base"
          // Read-only, not disabled: it takes the focus back with the text.
          readOnly={voice.phase === "transcribing"}
          autoFocus={compact}
          aria-busy={voice.phase === "transcribing"}
        />
        <div className="flex justify-end gap-2">
          {listening ? (
            <VoiceInputBar
              phase={voice.phase}
              elapsed={voice.elapsed}
              meterRef={voice.meter}
              onCancel={voice.cancel}
              onFinish={voice.toggle}
            />
          ) : (
            <>
              <VoiceInputButton
                phase={voice.phase}
                onToggle={voice.toggle}
                disabled={busy}
              />
              {busy ? (
                <Button
                  type="button"
                  size="icon-sm"
                  variant="outline"
                  onClick={() => void stop()}
                  aria-label={t.stop}
                  className="shrink-0 border-[color:var(--border-hairline)]"
                >
                  <IconStop aria-hidden className="size-5" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  size="icon-sm"
                  aria-label={t.send}
                  className="shrink-0"
                >
                  <IconArrowUp aria-hidden className="size-5" />
                </Button>
              )}
            </>
          )}
        </div>
      </form>
      <p className="text-center text-caption text-muted-foreground">
        {t.disclaimer}
        {!compact && (
          <>
            <br />
            {t.launcher.hint}
          </>
        )}
      </p>
    </section>
  );
}
