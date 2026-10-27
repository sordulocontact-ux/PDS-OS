"use client";

import { IconVolumeUp } from "nucleo-sharp-essential";
import { useState, useTransition } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { FileDropZone } from "@/components/ui/file-drop-zone";
import { useObjectUrl } from "@/components/ui/use-object-url";
import {
  AUDIO_ACCEPT,
  fileExtension,
  formatFileSize,
  isAudioFile,
  MAX_FILE_BYTES,
} from "@/lib/catalog/file-rules";
import { masterFinal } from "@/lib/i18n/fr/master-final";
import { masterInHouse } from "@/lib/i18n/fr/master-inhouse";
import { masterWorkflow } from "@/lib/i18n/fr/master-workflow";
import {
  DELIVERY_EXTENSIONS,
  deliveryNameOk,
} from "@/lib/master-workflow/delivery-rules";
import {
  openDeliverable,
  recordDeliverable,
} from "@/lib/master-workflow/deliverables-public-actions";
import {
  openMemberDelivery,
  recordMemberDelivery,
} from "@/lib/master-workflow/inhouse-actions";
import {
  openMasterDelivery,
  recordMasterDelivery,
} from "@/lib/master-workflow/transmission-public-actions";
import { createClient } from "@/lib/supabase/client";

const fr = { masterWorkflow, masterFinal, masterInHouse };

const timeFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Paris",
});

/**
 * « Déposer ma version », on the engineer's page, for one title. Choosing a
 * file never sends it (PROJ-BUG-09): the file waits in a confirmation step
 * (name, size, format, listening, « Remplacer »), and only « Confirmer
 * l'envoi » uploads it. The database then checks that the stored file has
 * the confirmed size, and the page says what the label received.
 */
export function DeliverVersion({
  token,
  masterId,
  role,
  deliverable,
  member,
}: {
  // The link's key; unused for the in-house engineer (`member`).
  token: string;
  masterId: string;
  role: "mix" | "mastering";
  // Set: another deliverable of the Brief (« Autres livrables »), not a
  // version; stems may come as a zip.
  deliverable?: { key: string; label: string };
  // The in-house engineer, in the app (proto `master:hugo`): his session.
  member?: { projectId: string; label: string };
}) {
  const t = fr.masterWorkflow.publicPackage.deliver;
  const d = fr.masterFinal.link;
  const zipOk = deliverable?.key === "stems";
  const [chosen, setChosen] = useState<File | null>(null);
  const preview = useObjectUrl(chosen);
  const [message, setMessage] = useState<{
    kind: "error" | "info";
    text: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  // The precise reason, before anything is sent (PROJ-BUG-08).
  function choose(file: File) {
    const extension = fileExtension(file.name);
    const zip = zipOk && extension === "zip";
    const refusal = zip
      ? file.size > MAX_FILE_BYTES
        ? t.tooLarge
        : null
      : !isAudioFile(file)
        ? deliverable
          ? d.notAccepted
          : t.notAudio
        : !extension || !DELIVERY_EXTENSIONS.includes(extension)
          ? t.errors.invalid_extension
          : !deliveryNameOk(file.name)
            ? t.errors.invalid_file_name
            : file.size > MAX_FILE_BYTES
              ? t.tooLarge
              : null;
    if (refusal) {
      setChosen(null);
      setMessage({ kind: "error", text: refusal });
      return;
    }
    setMessage(null);
    setChosen(file);
  }

  function send(file: File) {
    setMessage(null);
    startTransition(async () => {
      const slot = member
        ? await openMemberDelivery(member.projectId, masterId, role, file.name)
        : deliverable
          ? await openDeliverable(token, masterId, deliverable.key, file.name)
          : await openMasterDelivery(token, masterId, file.name);
      if (!slot.ok) return setMessage({ kind: "error", text: slot.error });
      // Some browsers give no type to a WAV or an AIFF.
      const mime =
        fileExtension(file.name) === "zip"
          ? "application/zip"
          : file.type.startsWith("audio/")
            ? file.type
            : `audio/${fileExtension(file.name) ?? "wav"}`;
      const { error } = await createClient()
        .storage.from("master-files")
        .upload(slot.path, file, { contentType: mime, upsert: false });
      if (error) {
        console.error("DeliverVersion upload:", error.message);
        return setMessage({ kind: "error", text: t.errors.failed });
      }
      const recorded = member
        ? await recordMemberDelivery(
            member.projectId,
            slot.path,
            file.name,
            mime,
            file.size,
          )
        : await (deliverable ? recordDeliverable : recordMasterDelivery)(
            token,
            slot.path,
            file.name,
            mime,
            file.size,
          );
      if (!recorded.ok)
        return setMessage({ kind: "error", text: recorded.error });
      setChosen(null);
      setMessage({
        kind: "info",
        text: t.received(
          file.name,
          formatFileSize(file.size),
          timeFormat.format(new Date()),
        ),
      });
    });
  }

  return (
    <div className="flex flex-col gap-2" aria-busy={pending || undefined}>
      {chosen ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-border p-4">
          <p className="text-sm font-medium">{t.confirmTitle}</p>
          <p className="text-sm break-words">
            {chosen.name}
            <span className="text-[color:var(--text-secondary)]">
              {" "}
              · {formatFileSize(chosen.size)} ·{" "}
              {(fileExtension(chosen.name) ?? "").toUpperCase()}
            </span>
          </p>
          {preview && (
            <audio
              controls
              preload="metadata"
              src={preview}
              aria-label={t.listen(chosen.name)}
              className="h-9 w-full"
            />
          )}
          <p className="text-caption text-[color:var(--text-secondary)]">
            {deliverable ? d.confirm : t.confirmHint[role]}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={pending}
              aria-busy={pending || undefined}
              onClick={() => send(chosen)}
            >
              {pending ? t.pending : t.confirm}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => setChosen(null)}
            >
              {t.replace}
            </Button>
          </div>
        </div>
      ) : (
        <FileDropZone
          label={
            member
              ? member.label
              : deliverable
                ? `${deliverable.label} *`
                : t.title
          }
          hint={
            member
              ? fr.masterInHouse.depositHint
              : deliverable
                ? zipOk
                  ? d.stemsHint
                  : d.hint
                : t.hint[role]
          }
          accept={zipOk ? `${AUDIO_ACCEPT},.zip,application/zip` : AUDIO_ACCEPT}
          icon={IconVolumeUp}
          disabled={pending}
          onFiles={([file]) => file && choose(file)}
        />
      )}
      {message && <FormMessage kind={message.kind}>{message.text}</FormMessage>}
    </div>
  );
}
