"use client";

import { IconPaperclip } from "nucleo-sharp-essential";
import { useRef, useState, useTransition } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { readAudioDuration } from "@/lib/catalog/audio-duration";
import {
  AUDIO_ACCEPT,
  FILES_TAB_CATEGORIES,
  isAudioFile,
  type FileOwner,
} from "@/lib/catalog/file-rules";
import { AUDIO_STATES, type AudioState } from "@/lib/catalog/title-rules";
import { uploadCatalogFile } from "@/lib/catalog/upload-file";
import { fr } from "@/lib/i18n/fr";

// Adds a file at once: pick the category, then the file. The list refreshes
// from the server once it is recorded. With `audio` (a title's Audio tab),
// the chips pick the audio state the file stands for instead, starting
// from the title's own, and the browser reads the file's duration.
export function FileUpload({
  organizationId,
  owner,
  audio,
}: {
  organizationId: string;
  owner: FileOwner;
  audio?: { defaultState: AudioState };
}) {
  const t = fr.catalogFiles;
  const a = fr.masterPage.audio;
  const choices: Record<string, string> = audio
    ? fr.catalog.audioStates
    : t.categories[owner.kind];
  const values: readonly string[] = audio
    ? AUDIO_STATES
    : FILES_TAB_CATEGORIES[owner.kind];
  const input = useRef<HTMLInputElement>(null);
  const [choice, setChoice] = useState<string>(
    audio ? audio.defaultState : "other",
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function upload(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (audio && !isAudioFile(file)) {
      setError(a.notAudio);
      return;
    }
    startTransition(async () => {
      const result = await uploadCatalogFile({
        organizationId,
        owner,
        file,
        ...(audio
          ? {
              category: "audio",
              audioState: choice as AudioState,
              durationSeconds: await readAudioDuration(file),
            }
          : { category: choice }),
      });
      if (!result.ok) setError(result.error);
      if (input.current) input.current.value = "";
    });
  }

  return (
    <div className="flex flex-col gap-3" aria-busy={pending || undefined}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="group"
          aria-label={audio ? a.stateLabel : t.upload.categoryLabel}
          className="flex flex-wrap gap-2"
        >
          {values.map((value) => (
            <FilterChip
              key={value}
              pressed={choice === value}
              disabled={pending}
              onClick={() => setChoice(value)}
            >
              {choices[value]}
            </FilterChip>
          ))}
        </div>
        <Button
          type="button"
          size="lg"
          disabled={pending}
          onClick={() => input.current?.click()}
        >
          <IconPaperclip aria-hidden data-icon="inline-start" />
          {pending ? t.upload.uploading : audio ? a.add : t.upload.add}
        </Button>
      </div>
      <input
        ref={input}
        type="file"
        accept={audio ? AUDIO_ACCEPT : undefined}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => upload(event.target.files?.[0])}
      />
      <p className="text-xs text-muted-foreground">
        {audio ? a.hint : t.upload.hint}
      </p>
      {error && <FormMessage kind="error">{error}</FormMessage>}
    </div>
  );
}
