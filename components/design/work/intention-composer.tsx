"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { VoiceFieldControl } from "@/components/voice/voice-field-control";
import { fr } from "@/lib/i18n/fr";

/**
 * Where the person answers PO: written or dictated (the transcript joins
 * what is written, nothing is sent on its own), then sent. ⌘/Ctrl + Entrée
 * sends too.
 */
export function IntentionComposer({
  id,
  defaultValue = "",
  pending,
  submitLabel,
  onSubmit,
  secondary,
}: {
  id: string;
  defaultValue?: string;
  pending: boolean;
  submitLabel: string;
  onSubmit: (text: string) => void;
  // « Plus tard » or « Annuler ».
  secondary?: React.ReactNode;
}) {
  const t = fr.conceptionWork.composer;
  return (
    <form
      className="ml-auto flex w-full max-w-[85%] flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const text = String(new FormData(e.currentTarget).get("text") ?? "");
        if (text.trim()) onSubmit(text.trim());
      }}
    >
      <Label htmlFor={id} className="sr-only">
        {t.label}
      </Label>
      <div className="relative">
        <Textarea
          id={id}
          name="text"
          required
          maxLength={2000}
          rows={3}
          defaultValue={defaultValue}
          placeholder={t.placeholder}
          disabled={pending}
          className="min-h-24 pb-12 text-base md:text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <div className="absolute inset-x-2 bottom-2 flex items-center">
          <VoiceFieldControl fieldId={id} />
        </div>
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        {secondary}
        <Button type="submit" disabled={pending}>
          {pending ? t.sending : submitLabel}
        </Button>
      </div>
    </form>
  );
}
