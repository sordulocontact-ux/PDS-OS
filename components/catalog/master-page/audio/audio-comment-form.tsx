"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { formatTimecode, parseTimecode } from "@/lib/catalog/audio-versions";
import { commentAudioVersion } from "@/lib/catalog/master/audio-actions";
import { fr } from "@/lib/i18n/fr";

/**
 * « Ajouter un retour », in a modal (Sacha, 12/10/2026: one small button per
 * version, never the form under each one). The moment starts where the
 * player stands when the modal opens; empty means the whole version.
 */
export function AudioCommentForm({
  masterId,
  fileId,
  startSeconds,
  onDone,
}: {
  masterId: string;
  fileId: string;
  // The player's position when the modal opened (null: not started).
  startSeconds: number | null;
  onDone: () => void;
}) {
  const c = fr.masterPage.audio.versions.comments;
  const [at, setAt] = useState(
    startSeconds && startSeconds >= 1 ? formatTimecode(startSeconds) : "",
  );
  const [body, setBody] = useState("");
  const [errors, setErrors] = useState<{ at?: string; body?: string }>({});
  const { pending, error, run } = useWriteSubmit(onDone, c.sent);

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const seconds = at.trim() === "" ? null : parseTimecode(at);
        const next = {
          at: at.trim() !== "" && seconds === null ? c.atInvalid : undefined,
          body: body.trim() ? undefined : c.bodyRequired,
        };
        setErrors(next);
        if (next.body) document.getElementById(`comment-${fileId}`)?.focus();
        else if (next.at)
          document.getElementById(`comment-at-${fileId}`)?.focus();
        if (next.at || next.body) return;
        run(() =>
          commentAudioVersion({
            masterId,
            fileId,
            atSeconds: seconds,
            body: body.trim(),
          }),
        );
      }}
    >
      <TextareaField
        id={`comment-${fileId}`}
        name="body"
        label={c.bodyLabel}
        required
        rows={3}
        maxLength={2000}
        autoFocus
        value={body}
        error={errors.body}
        onChange={(event) => setBody(event.target.value)}
      />
      <div className="w-40">
        <Field
          id={`comment-at-${fileId}`}
          name="at"
          label={c.atLabel}
          inputMode="numeric"
          placeholder="1:23"
          value={at}
          error={errors.at}
          onChange={(event) => setAt(event.target.value)}
        />
      </div>
      <p className="text-sm text-[color:var(--text-tertiary)]">{c.atHint}</p>
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        onCancel={onDone}
        submitLabel={c.send}
        pending={pending}
      />
    </form>
  );
}
