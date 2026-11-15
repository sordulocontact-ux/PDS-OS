"use client";

import { IconVolumeUp } from "nucleo-sharp-essential";
import { useId, useState, useTransition } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { AudioPlayer } from "@/components/ui/audio-player";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { FileDropZone } from "@/components/ui/file-drop-zone";
import { useObjectUrl } from "@/components/ui/use-object-url";
import { toast } from "@/components/ui/toast";
import { Label } from "@/components/ui/label";
import {
  AUDIO_ACCEPT,
  fileExtension,
  formatFileSize,
  isAudioFile,
  MAX_MASTER_FILE_BYTES,
} from "@/lib/catalog/file-rules";
import { masterFileRequests } from "@/lib/i18n/fr/master-file-requests";
import { masterWorkflow } from "@/lib/i18n/fr/master-workflow";
import {
  DELIVERY_EXTENSIONS,
  deliveryNameOk,
} from "@/lib/master-workflow/delivery-rules";
import {
  openFileRequestDelivery,
  recordFileRequestDelivery,
} from "@/lib/master-workflow/file-request-actions";
import { createClient } from "@/lib/supabase/client";

const fr = { masterFileRequests, masterWorkflow };
const t = fr.masterFileRequests;
const d = fr.masterWorkflow.publicPackage.deliver;

type State = "rough_mix" | "demo";

/**
 * « Déposer le fichier » of a title asked of the viewer (lot 9 bis), in its
 * dialog. Choosing a file never sends it (PROJ-BUG-09): name, size, format,
 * listening, then « Confirmer l'envoi ». The file becomes an audio version
 * of that title only; the database checks the size and marks the line
 * received.
 */
export function FileRequestDeposit({
  projectId,
  requestId,
  title,
  onDone,
}: {
  projectId: string;
  requestId: string;
  // The title's name in the project.
  title: string;
  onDone: () => void;
}) {
  const [state, setState] = useState<State>("rough_mix");
  const [chosen, setChosen] = useState<File | null>(null);
  const preview = useObjectUrl(chosen);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const stateLabel = useId();

  function choose(file: File) {
    const extension = fileExtension(file.name);
    const refusal = !isAudioFile(file)
      ? d.notAudio
      : !extension || !DELIVERY_EXTENSIONS.includes(extension)
        ? d.errors.invalid_extension
        : !deliveryNameOk(file.name)
          ? d.errors.invalid_file_name
          : file.size > MAX_MASTER_FILE_BYTES
            ? d.tooLarge
            : null;
    setError(refusal);
    setChosen(refusal ? null : file);
  }

  function send(file: File) {
    setError(null);
    startTransition(async () => {
      const slot = await openFileRequestDelivery(requestId, file.name);
      if (!slot.ok) return setError(slot.error);
      // Some browsers give no type to a WAV or an AIFF.
      const mime = file.type.startsWith("audio/")
        ? file.type
        : `audio/${fileExtension(file.name) ?? "wav"}`;
      const { error: uploadError } = await createClient()
        .storage.from("master-files")
        .upload(slot.path, file, { contentType: mime, upsert: false });
      if (uploadError) {
        console.error("FileRequestDeposit upload:", uploadError.message);
        return setError(t.errors.depositFailed);
      }
      const recorded = await recordFileRequestDelivery(
        projectId,
        slot.path,
        file.name,
        mime,
        file.size,
        state,
      );
      if (!recorded.ok) return setError(recorded.error);
      toast.success(t.received(title));
      onDone();
    });
  }

  return (
    <div className="flex flex-col gap-4" aria-busy={pending || undefined}>
      <div className="flex flex-col gap-1.5">
        <Label id={stateLabel}>{t.audioState}</Label>
        <SegmentedControl<State>
          aria-labelledby={stateLabel}
          className="self-start"
          value={state}
          onChange={(next) => next && setState(next)}
          options={[
            { value: "rough_mix", label: t.audioStates.rough_mix },
            { value: "demo", label: t.audioStates.demo },
          ]}
        />
      </div>
      {chosen ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
          <p className="text-sm font-medium">{d.confirmTitle}</p>
          <p className="text-sm break-words">
            {chosen.name}
            <span className="text-[color:var(--text-secondary)]">
              {" "}
              · {formatFileSize(chosen.size)} ·{" "}
              {(fileExtension(chosen.name) ?? "").toUpperCase()}
            </span>
          </p>
          {preview && (
            <AudioPlayer src={preview} label={d.listen(chosen.name)} />
          )}
          <p className="text-caption text-[color:var(--text-secondary)]">
            {t.confirmHint}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={pending}
              aria-busy={pending || undefined}
              onClick={() => send(chosen)}
            >
              {pending ? d.pending : d.confirm}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => setChosen(null)}
            >
              {d.replace}
            </Button>
          </div>
        </div>
      ) : (
        <FileDropZone
          label={t.dropLabel}
          hint={t.dropHint}
          accept={AUDIO_ACCEPT}
          icon={IconVolumeUp}
          disabled={pending}
          onFiles={([file]) => file && choose(file)}
        />
      )}
      {error && <FormMessage kind="error">{error}</FormMessage>}
    </div>
  );
}
