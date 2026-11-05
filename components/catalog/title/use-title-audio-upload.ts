"use client";

import { useRef, useState } from "react";

import { readAudioDuration } from "@/lib/catalog/audio-duration";
import {
  AUDIO_FORMAT_LIST,
  MAX_MASTER_FILE_BYTES,
  isAudioFile,
} from "@/lib/catalog/file-rules";
import { isAudioState } from "@/lib/catalog/title-rules";
import { uploadCatalogFile } from "@/lib/catalog/upload-file";
import { catalog } from "@/lib/i18n/fr/catalog";
import { catalogFiles } from "@/lib/i18n/fr/catalog-files";
import { masterPage } from "@/lib/i18n/fr/master-page";

const fr = { catalog, catalogFiles, masterPage };

/**
 * The audio file chosen in the title form, sent once the title exists
 * (docs/ARCHITECTURE.md § 2 septies). It needs the audio state it stands
 * for: the form refuses to submit without one rather than guessing it.
 */
export function useTitleAudioUpload(organizationId: string | null) {
  const t = fr.catalog.masterForm;
  const [file, setFile] = useState<File | null>(null);
  const [durationSeconds, setDuration] = useState<number | null>(null);
  const [fileError, setFileError] = useState<string>();
  const [stateError, setStateError] = useState<string>();
  const [sending, setSending] = useState(false);
  // The file whose duration is being read: the person may change it meanwhile.
  const chosen = useRef<File | null>(null);

  function choose(next: File | null) {
    setFileError(undefined);
    setStateError(undefined);
    setDuration(null);
    if (next && !isAudioFile(next)) {
      setFileError(fr.masterPage.audio.notAudio(AUDIO_FORMAT_LIST));
      return;
    }
    if (next && next.size > MAX_MASTER_FILE_BYTES) {
      setFileError(fr.catalogFiles.tooLargeMaster);
      return;
    }
    setFile(next);
    chosen.current = next;
    if (next)
      void readAudioDuration(next).then((seconds) => {
        if (chosen.current === next) setDuration(seconds);
      });
  }

  /** False (and says why) when a file is chosen without its audio state. */
  function check(audioState: string): boolean {
    const ok = !file || isAudioState(audioState);
    setStateError(ok ? undefined : t.errors.fileNeedsAudioState);
    return ok;
  }

  /** Sends the file to the new title; true when there was nothing to send. */
  async function send(masterId: string, audioState: string): Promise<boolean> {
    if (!file || !organizationId || !isAudioState(audioState)) return true;
    setSending(true);
    const result = await uploadCatalogFile({
      organizationId,
      owner: { kind: "master", id: masterId },
      category: "audio",
      file,
      audioState,
      durationSeconds,
    });
    setSending(false);
    // A failure is said by the form, which stays on screen with the way out.
    return result.ok;
  }

  return {
    file,
    durationSeconds,
    fileError,
    stateError,
    sending,
    choose,
    check,
    clearStateError: () => setStateError(undefined),
    send,
  };
}
