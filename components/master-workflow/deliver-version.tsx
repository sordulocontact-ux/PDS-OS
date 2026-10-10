"use client";

import { useRouter } from "next/navigation";
import { IconVolumeUp } from "nucleo-sharp-essential";
import { useState, useTransition } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { FileDropZone } from "@/components/ui/file-drop-zone";
import {
  AUDIO_ACCEPT,
  fileExtension,
  isAudioFile,
  MAX_FILE_BYTES,
} from "@/lib/catalog/file-rules";
import { fr } from "@/lib/i18n/fr";
import {
  openMasterDelivery,
  recordMasterDelivery,
} from "@/lib/master-workflow/transmission-public-actions";
import { createClient } from "@/lib/supabase/client";

/**
 * « Déposer ma version », on the engineer's page, for one title: the
 * database opens a one-time path, the browser uploads the file there, then
 * the database records it as the title's new version (UX test of
 * 09/10/2026: the project's owner re-entered every file).
 */
export function DeliverVersion({
  token,
  masterId,
  role,
}: {
  token: string;
  masterId: string;
  role: "mix" | "mastering";
}) {
  const t = fr.masterWorkflow.publicPackage.deliver;
  const router = useRouter();
  const [message, setMessage] = useState<{
    kind: "error" | "info";
    text: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  function send(file: File) {
    if (!isAudioFile(file))
      return setMessage({ kind: "error", text: t.notAudio });
    if (file.size > MAX_FILE_BYTES)
      return setMessage({ kind: "error", text: t.tooLarge });
    setMessage(null);
    startTransition(async () => {
      const slot = await openMasterDelivery(token, masterId, file.name);
      if (!slot.ok) return setMessage({ kind: "error", text: slot.error });
      // Some browsers give no type to a WAV or an AIFF.
      const mime = file.type.startsWith("audio/")
        ? file.type
        : `audio/${fileExtension(file.name) ?? "wav"}`;
      const { error } = await createClient()
        .storage.from("master-files")
        .upload(slot.path, file, { contentType: mime, upsert: false });
      if (error) {
        console.error("DeliverVersion upload:", error.message);
        return setMessage({ kind: "error", text: t.errors.failed });
      }
      const recorded = await recordMasterDelivery(
        token,
        slot.path,
        file.name,
        mime,
      );
      if (!recorded.ok)
        return setMessage({ kind: "error", text: recorded.error });
      setMessage({ kind: "info", text: t.done(file.name) });
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2" aria-busy={pending || undefined}>
      <FileDropZone
        label={pending ? t.pending : t.title}
        hint={t.hint[role]}
        accept={AUDIO_ACCEPT}
        icon={IconVolumeUp}
        disabled={pending}
        onFiles={([file]) => file && send(file)}
      />
      {message && <FormMessage kind={message.kind}>{message.text}</FormMessage>}
    </div>
  );
}
