"use client";

import { useRef, useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { IconDownload } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Timestamp } from "@/components/ui/timestamp";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import {
  formatTimecode,
  parseTimecode,
  type AudioComment,
} from "@/lib/catalog/audio-versions";
import { commentAudioVersion } from "@/lib/catalog/master/audio-actions";
import { fr } from "@/lib/i18n/fr";

/**
 * Listening to a version without leaving PDS OS (retour Catalogue 22), and
 * its comments at an instant of the recording (retour 26): a comment's
 * moment moves the player there; « Moment de l'écoute » takes the player's
 * position. Comments are never rewritten.
 */
export function AudioVersionListening({
  masterId,
  fileId,
  label,
  listenUrl,
  downloadUrl,
  comments,
}: {
  masterId: string;
  fileId: string;
  label: string;
  listenUrl: string | null;
  downloadUrl: string | null;
  comments: AudioComment[];
}) {
  const t = fr.masterPage.audio.versions;
  const c = t.comments;
  const player = useRef<HTMLAudioElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const [at, setAt] = useState("");
  const [errors, setErrors] = useState<{ at?: string; body?: string }>({});
  const { pending, error, run } = useWriteSubmit(() => {
    form.current?.reset();
    setAt("");
  }, c.sent);

  function seek(seconds: number) {
    const audio = player.current;
    if (!audio) return;
    audio.currentTime = seconds;
    void audio.play().catch(() => undefined);
  }

  return (
    <div className="flex flex-col gap-3">
      {listenUrl && (
        <div className="flex flex-wrap items-center gap-3">
          <audio
            ref={player}
            controls
            preload="none"
            src={listenUrl}
            aria-label={t.listen(label)}
            className="h-9 max-w-full"
          />
          {downloadUrl && (
            <a
              href={downloadUrl}
              className="inline-flex items-center gap-1.5 text-sm underline underline-offset-4"
            >
              <IconDownload aria-hidden className="size-4" />
              {t.download}
            </a>
          )}
        </div>
      )}
      <details className="group">
        <summary className="cursor-pointer text-sm font-medium text-[color:var(--text-secondary)] select-none">
          {c.title(comments.length)}
        </summary>
        <div className="mt-3 flex flex-col gap-4">
          {comments.length === 0 ? (
            <p className="text-sm text-[color:var(--text-tertiary)]">
              {c.empty}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {comments.map((comment) => (
                <li key={comment.id} className="flex flex-col gap-0.5 text-sm">
                  <span className="flex flex-wrap items-baseline gap-x-2 text-[color:var(--text-secondary)]">
                    {comment.atSeconds !== null && listenUrl ? (
                      <button
                        type="button"
                        onClick={() => seek(comment.atSeconds ?? 0)}
                        className="font-medium text-[color:var(--text-primary)] tabular-nums underline underline-offset-4"
                      >
                        {c.at(formatTimecode(comment.atSeconds))}
                      </button>
                    ) : (
                      <span className="tabular-nums">
                        {comment.atSeconds !== null
                          ? c.at(formatTimecode(comment.atSeconds))
                          : c.whole}
                      </span>
                    )}
                    <span>
                      {comment.authorName && `${comment.authorName} · `}
                      <Timestamp iso={comment.createdAt} />
                    </span>
                  </span>
                  <span className="whitespace-pre-line">{comment.body}</span>
                </li>
              ))}
            </ul>
          )}
          <form
            ref={form}
            noValidate
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              const body = String(
                new FormData(event.currentTarget).get("body") ?? "",
              ).trim();
              const seconds = at.trim() === "" ? null : parseTimecode(at);
              const next = {
                at:
                  at.trim() !== "" && seconds === null
                    ? c.atInvalid
                    : undefined,
                body: body ? undefined : c.bodyRequired,
              };
              setErrors(next);
              if (next.at || next.body) return;
              run(() =>
                commentAudioVersion({
                  masterId,
                  fileId,
                  atSeconds: seconds,
                  body,
                }),
              );
            }}
          >
            <TextareaField
              id={`comment-${fileId}`}
              name="body"
              label={c.bodyLabel}
              required
              rows={2}
              maxLength={2000}
              error={errors.body}
            />
            <div className="flex flex-wrap items-end gap-2">
              <div className="w-40">
                <Field
                  id={`comment-at-${fileId}`}
                  name="at"
                  label={c.atLabel}
                  inputMode="numeric"
                  placeholder="1:23"
                  value={at}
                  onChange={(event) => setAt(event.target.value)}
                  error={errors.at}
                />
              </div>
              {listenUrl && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setAt(formatTimecode(player.current?.currentTime ?? 0))
                  }
                >
                  {c.fromPlayer}
                </Button>
              )}
              <Button type="submit" size="sm" disabled={pending}>
                {pending ? fr.dialogs.saving : c.send}
              </Button>
            </div>
            <p className="text-sm text-[color:var(--text-tertiary)]">
              {c.atHint}
            </p>
            {error && <FormMessage kind="error">{error}</FormMessage>}
          </form>
        </div>
      </details>
    </div>
  );
}
