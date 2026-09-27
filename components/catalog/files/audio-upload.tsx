"use client";

import { IconPaperclip } from "nucleo-sharp-essential";
import { useRef, useState, useTransition } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { readAudioDuration } from "@/lib/catalog/audio-duration";
import {
  AUDIO_ACCEPT,
  isAudioFile,
  type FileOwner,
} from "@/lib/catalog/file-rules";
import { AUDIO_STATES, type AudioState } from "@/lib/catalog/title-rules";
import { uploadCatalogFile } from "@/lib/catalog/upload-file";
import { fr } from "@/lib/i18n/fr";

// Audio tab of a title: pick the audio state the file stands for (starting
// from the title's own), then the file; the browser reads its duration.
// The list refreshes from the server once it is recorded. Other files go
// through the library (FileImport).
export function AudioUpload({
  organizationId,
  owner,
  defaultState,
}: {
  organizationId: string;
  owner: FileOwner;
  defaultState: AudioState;
}) {
  const a = fr.masterPage.audio;
  const input = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<AudioState>(defaultState);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function upload(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!isAudioFile(file)) {
      setError(a.notAudio);
      return;
    }
    startTransition(async () => {
      const result = await uploadCatalogFile({
        organizationId,
        owner,
        file,
        category: "audio",
        audioState: state,
        durationSeconds: await readAudioDuration(file),
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
          aria-label={a.stateLabel}
          className="flex flex-wrap gap-2"
        >
          {AUDIO_STATES.map((value) => (
            <FilterChip
              key={value}
              pressed={state === value}
              disabled={pending}
              onClick={() => setState(value)}
            >
              {fr.catalog.audioStates[value]}
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
          {pending ? fr.catalogFiles.add.uploading : a.add}
        </Button>
      </div>
      <input
        ref={input}
        type="file"
        accept={AUDIO_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => upload(event.target.files?.[0])}
      />
      <p className="text-xs text-muted-foreground">{a.hint}</p>
      {error && <FormMessage kind="error">{error}</FormMessage>}
    </div>
  );
}
