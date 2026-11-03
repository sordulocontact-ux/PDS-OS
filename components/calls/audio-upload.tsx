"use client";

import { useState, type FormEvent } from "react";
import { toast } from "@/components/ui/toast";

import { useCanEditProject } from "@/components/projects/edit-access";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  ALLOWED_AUDIO_MIMES,
  AUDIO_TYPES,
  MAX_AUDIO_BYTES,
  type CallErrorCode,
} from "@/lib/calls/constants";
import { uploadCallAudio } from "@/lib/calls/upload-audio";
import { calls } from "@/lib/i18n/fr/calls";

const fr = { calls };

function describe(file: File): { ext: string; mime: string } | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const fromExt = AUDIO_TYPES[ext];
  if (!fromExt) return null;
  const known = (ALLOWED_AUDIO_MIMES as readonly string[]).includes(file.type);
  return { ext, mime: known ? file.type : fromExt };
}

/**
 * File picker for an existing recording. The upload itself is shared with the
 * in-app recorder (lib/calls/upload-audio.ts).
 */
export function AudioUpload({
  callId,
  organizationId,
}: {
  callId: string;
  organizationId: string;
}) {
  const t = fr.calls.audio;
  const [error, setError] = useState<
    CallErrorCode | "no_file" | "upload_failed" | null
  >(null);
  const [pending, setPending] = useState(false);
  const canEdit = useCanEditProject();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const file = new FormData(event.currentTarget).get("audio");
    if (!(file instanceof File) || file.size === 0) return setError("no_file");
    if (file.size > MAX_AUDIO_BYTES) return setError("file_too_large");
    const type = describe(file);
    if (!type) return setError("unsupported_type");

    setPending(true);
    const result = await uploadCallAudio({
      callId,
      organizationId,
      body: file,
      ext: type.ext,
      mime: type.mime,
    });
    setPending(false);
    if (!result.ok) return setError(result.error);
    toast.success(t.uploaded);
  }

  if (!canEdit) return null;

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <Label htmlFor="call-audio" required>
        {t.label}
      </Label>
      <input
        id="call-audio"
        name="audio"
        type="file"
        aria-required
        accept="audio/*,video/mp4,.m4a"
        disabled={pending}
        aria-describedby="call-audio-hint"
        className="text-sm file:mr-3 file:h-10 file:rounded-lg file:border file:border-input file:bg-background file:px-3 file:text-sm file:font-medium"
      />
      <p id="call-audio-hint" className="text-sm text-muted-foreground">
        {t.hint}
      </p>
      {error && (
        <p role="alert" className="text-sm text-error">
          {fr.calls.errors[error]}
        </p>
      )}
      <Button
        type="submit"
        disabled={pending}
        className="h-10 justify-self-start px-4"
      >
        {pending ? t.pending : t.submit}
      </Button>
    </form>
  );
}
