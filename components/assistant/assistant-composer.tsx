"use client";

import type { FileUIPart } from "ai";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import {
  AttachImageButton,
  ComposerImages,
} from "@/components/assistant/composer-images";
import { useImageAttachments } from "@/components/assistant/use-image-attachments";
import { FieldError } from "@/components/auth/form-message";
import { IconArrowUp, IconStop } from "@/components/icons";
import { useFileDrop } from "@/components/ui/use-file-drop";
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
 * window) it listens at once and sends what was dictated. Images join the
 * question by the paperclip, a drop or ⌘V (docs/ASSISTANT.md § 2 quinquies):
 * `onAsk` gets them with the text, which may then be empty.
 */
export function AssistantComposer({
  onAsk,
  onStop,
  busy,
  compact = false,
  voiceFirst = false,
  autoFocus = false,
  placeholder = fr.assistant.placeholder,
  onType,
}: {
  onAsk: (question: string, images: FileUIPart[]) => void;
  onStop: () => void;
  busy: boolean;
  compact?: boolean;
  voiceFirst?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
  // What is typed, as it is typed (Finance's « Je veux… » suggestions).
  onType?: (text: string) => void;
}) {
  const t = fr.assistant;
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const images = useImageAttachments();
  const drop = useFileDrop({ multiple: true, onFiles: images.add });
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
    onType?.(joined);
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
    if (busy || text.length > MAX_LENGTH) return;
    if (images.uploading) return images.setError(t.images.waiting);
    if (images.failed) return images.setError(t.images.retryFailed);
    if (!text && images.parts.length === 0) return;
    onAsk(text, images.parts);
    setInput("");
    onType?.("");
    images.clear();
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
        {...drop.handlers}
        aria-describedby={images.error ? "assistant-images-error" : undefined}
        className={cn(
          "flex flex-col rounded-2xl border border-transparent bg-[var(--surface-tint)] transition-[border-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] has-[textarea:focus-visible]:border-ring",
          // An image held over the box: it takes it.
          drop.dragging && "border-ring",
          // Compact: at the foot of a conversation, where the answers need the room.
          compact ? "min-h-28 gap-3 p-4" : "min-h-51 gap-4 p-6",
        )}
      >
        <ComposerImages images={images.images} onRemove={images.remove} />
        <label htmlFor="assistant-input" className="sr-only">
          {t.label}
        </label>
        <Textarea
          ref={inputRef}
          id="assistant-input"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            onType?.(e.target.value);
          }}
          onKeyDown={onKeyDown}
          placeholder={listening ? fr.voice.input.listening : placeholder}
          rows={1}
          maxLength={MAX_LENGTH}
          // The box is the field: no fill of its own, in dark mode too.
          className="max-h-60 min-h-0 grow resize-none rounded-none border-0 bg-transparent p-0 text-base font-medium focus-visible:ring-0 md:text-base dark:bg-transparent"
          // Read-only, not disabled: it takes the focus back with the text.
          readOnly={voice.phase === "transcribing"}
          autoFocus={autoFocus}
          aria-busy={voice.phase === "transcribing"}
        />
        <div className="flex items-center gap-2">
          {!listening && <AttachImageButton onFiles={images.add} />}
          <span className="grow" />
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
      <FieldError id="assistant-images-error">
        {images.error ?? undefined}
      </FieldError>
    </>
  );
}
