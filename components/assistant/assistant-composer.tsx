"use client";

import { IconArrowUp, IconStop } from "@/components/icons";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import { useVoiceInput } from "@/components/voice/use-voice-input";
import {
  VoiceInputBar,
  VoiceInputButton,
  VoiceInputStatus,
} from "@/components/voice/voice-input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { assistant } from "@/lib/i18n/fr/assistant";
import { voice } from "@/lib/i18n/fr/voice";
import { cn } from "@/lib/utils";

const fr = { assistant, voice };

export const MAX_LENGTH = 2000;

/**
 * The PO input (Figma "Desktop - 11"): a tinted box with the microphone and
 * send buttons. `onAsk` receives a trimmed question within MAX_LENGTH.
 * Dictated text joins what was typed; with `voiceFirst` (Espace Espace
 * window) it listens at once and sends what was dictated.
 */
export function AssistantComposer({
  onAsk,
  onStop,
  busy,
  compact = false,
  voiceFirst = false,
  autoFocus = false,
  placeholder = fr.assistant.placeholder,
}: {
  onAsk: (question: string) => void;
  onStop: () => void;
  busy: boolean;
  compact?: boolean;
  voiceFirst?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
}) {
  const t = fr.assistant;
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
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

  function ask(question: string) {
    const text = question.trim();
    if (!text || busy || text.length > MAX_LENGTH) return;
    onAsk(text);
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
    <>
      <VoiceInputStatus phase={voice.phase} error={voice.error} />
      <form
        onSubmit={onSubmit}
        className={cn(
          "flex flex-col gap-4 rounded-2xl border border-transparent bg-[var(--surface-tint)] p-6 transition-[border-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] has-[textarea:focus-visible]:border-ring",
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
          placeholder={listening ? fr.voice.input.listening : placeholder}
          rows={1}
          maxLength={MAX_LENGTH}
          className="max-h-60 min-h-0 grow resize-none rounded-none border-0 p-0 text-base font-medium focus-visible:ring-0 md:text-base"
          // Read-only, not disabled: it takes the focus back with the text.
          readOnly={voice.phase === "transcribing"}
          autoFocus={autoFocus}
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
                  onClick={onStop}
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
    </>
  );
}
