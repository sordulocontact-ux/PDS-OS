"use client";

import { useVoiceInput } from "@/components/voice/use-voice-input";
import {
  VoiceInputBar,
  VoiceInputButton,
  VoiceInputStatus,
} from "@/components/voice/voice-input";
import { fr } from "@/lib/i18n/fr";

// Writes into a field as if typed, so a controlled field updates too.
function appendTo(field: HTMLTextAreaElement | HTMLInputElement, text: string) {
  const joined = [field.value.trim(), text].filter(Boolean).join(" ");
  const value = field.maxLength > 0 ? joined.slice(0, field.maxLength) : joined;
  const prototype =
    field instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, "value")?.set?.call(field, value);
  field.dispatchEvent(new Event("input", { bubbles: true }));
  field.focus();
  field.setSelectionRange(value.length, value.length);
}

/**
 * Voice typing into any text field, placed in its bottom corner (the
 * `addon` of TextareaField): the microphone; while listening, the waveform
 * with cancel and validate. The transcript joins what was already written,
 * where the user reads it before sending: nothing is sent on its own.
 */
export function VoiceFieldControl({ fieldId }: { fieldId: string }) {
  const voice = useVoiceInput((text) => {
    const field = document.getElementById(fieldId);
    if (
      field instanceof HTMLTextAreaElement ||
      field instanceof HTMLInputElement
    )
      appendTo(field, text);
  });
  const listening = voice.phase === "requesting" || voice.phase === "recording";

  return (
    <div className="flex w-full items-center justify-end gap-2">
      <div className="mr-auto min-w-0">
        <VoiceInputStatus phase={voice.phase} error={voice.error} />
      </div>
      {listening ? (
        // The whole width of the field: the waveform runs to its left edge.
        <div className="flex min-w-0 grow">
          <VoiceInputBar
            phase={voice.phase}
            elapsed={voice.elapsed}
            meterRef={voice.meter}
            onCancel={voice.cancel}
            onFinish={voice.toggle}
          />
        </div>
      ) : (
        <VoiceInputButton
          phase={voice.phase}
          onToggle={voice.toggle}
          startLabel={fr.voice.input.startField}
        />
      )}
    </div>
  );
}
