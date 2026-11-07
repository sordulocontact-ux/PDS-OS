"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { useCanEditProject } from "@/components/projects/edit-access";
import { Button } from "@/components/ui/button";
import { FilePickField } from "@/components/ui/file-pick-field";
import { toast } from "@/components/ui/toast";
import {
  ALLOWED_AUDIO_MIMES,
  AUDIO_TYPES,
  MAX_AUDIO_BYTES,
  MAX_TRANSCRIPT_BYTES,
  TRANSCRIPT_EXTENSIONS,
  transcriptExtensionOf,
  type CallErrorCode,
} from "@/lib/calls/constants";
import { uploadCallAudio } from "@/lib/calls/upload-audio";
import { calls } from "@/lib/i18n/fr/calls";

const fr = { calls };

type UploadError = CallErrorCode | "no_file" | "upload_failed";

const ACCEPT = [
  "audio/*",
  "video/mp4",
  ...Object.keys(AUDIO_TYPES).map((e) => `.${e}`),
  ...TRANSCRIPT_EXTENSIONS.map((e) => `.${e}`),
].join(",");

function audioOf(file: File): { ext: string; mime: string } | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const fromExt = AUDIO_TYPES[ext];
  if (!fromExt) return null;
  const known = (ALLOWED_AUDIO_MIMES as readonly string[]).includes(file.type);
  return { ext, mime: known ? file.type : fromExt };
}

async function sendTranscript(
  callId: string,
  file: File,
): Promise<{ ok: true } | { ok: false; error: UploadError }> {
  const body = new FormData();
  body.set("file", file);
  try {
    const response = await fetch(`/api/calls/${callId}/transcript-file`, {
      method: "POST",
      body,
    });
    return (await response.json()) as
      { ok: true } | { ok: false; error: CallErrorCode };
  } catch {
    return { ok: false, error: "upload_failed" };
  }
}

/**
 * A file instead of the in-app recording (Sacha 07/11/2026): an audio,
 * uploaded straight to storage and transcribed (lib/calls/upload-audio.ts),
 * or a transcript (PDF, Word, text, subtitles), read as text by the server
 * and processed as the call's transcription (lib/calls/transcript-file.ts).
 * One drop zone for both, as for every file in PDS OS.
 */
export function CallFileUpload({
  callId,
  organizationId,
}: {
  callId: string;
  organizationId: string;
}) {
  const t = fr.calls.audio;
  const router = useRouter();
  const canEdit = useCanEditProject();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<UploadError | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!file || file.size === 0) return setError("no_file");
    const audio = audioOf(file);
    const transcript = audio ? null : transcriptExtensionOf(file.name);
    if (!audio && !transcript) return setError("unsupported_type");
    if (file.size > (audio ? MAX_AUDIO_BYTES : MAX_TRANSCRIPT_BYTES))
      return setError("file_too_large");

    setPending(true);
    const result = audio
      ? await uploadCallAudio({
          callId,
          organizationId,
          body: file,
          ext: audio.ext,
          mime: audio.mime,
        })
      : await sendTranscript(callId, file);
    setPending(false);
    if (!result.ok) return setError(result.error);
    toast.success(audio ? t.uploaded : t.transcriptUploaded);
    router.refresh();
  }

  if (!canEdit) return null;

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-3">
      <FilePickField
        id="call-file"
        label={t.drop}
        hint={t.hint}
        accept={ACCEPT}
        disabled={pending}
        chosenLabel={t.chosen}
        file={file}
        error={error ? fr.calls.errors[error] : null}
        onFile={(picked) => {
          setFile(picked);
          setError(null);
        }}
      />
      <Button
        type="submit"
        disabled={pending}
        aria-busy={pending || undefined}
        className="justify-self-start"
      >
        {pending ? t.pending : t.submit}
      </Button>
    </form>
  );
}
