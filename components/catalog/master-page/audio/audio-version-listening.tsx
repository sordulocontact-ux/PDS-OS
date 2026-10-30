"use client";

import { useRef, useState } from "react";

import { AudioCommentForm } from "@/components/catalog/master-page/audio/audio-comment-form";
import { IconDownload } from "@/components/icons";
import { AudioPlayer } from "@/components/ui/audio-player";
import { DialogButton } from "@/components/ui/dialog-button";
import { Timestamp } from "@/components/ui/timestamp";
import {
  formatTimecode,
  type AudioComment,
} from "@/lib/catalog/audio-versions";
import { masterPage } from "@/lib/i18n/fr/master-page";

const fr = { masterPage };

// Notes shown before « Voir les autres retours ».
const SHOWN = 2;

/**
 * Listening to a version without leaving PDS OS (retour Catalogue 22), the
 * listening notes already written (retour 26, shown only when there are
 * some, the two latest first in view, the others one click away; a note's
 * moment moves the player there), then one row of buttons:
 * « Ajouter un retour » in a modal (Sacha, 12/10/2026), and the decision
 * when one is expected (`decision`). Notes are never rewritten and decide
 * nothing.
 */
export function AudioVersionListening({
  masterId,
  fileId,
  label,
  listenUrl,
  downloadUrl,
  comments,
  decision,
}: {
  masterId: string;
  fileId: string;
  label: string;
  listenUrl: string | null;
  downloadUrl: string | null;
  comments: AudioComment[];
  // « Demander des corrections » and « Valider cette version », if any.
  decision?: React.ReactNode;
}) {
  const t = fr.masterPage.audio.versions;
  const c = t.comments;
  const player = useRef<HTMLAudioElement>(null);
  const [all, setAll] = useState(false);
  const hidden = Math.max(0, comments.length - SHOWN);
  // Folded: the latest written, kept in the recording's order.
  const latest = new Set(
    [...comments]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, SHOWN)
      .map((comment) => comment.id),
  );
  const shown = all ? comments : comments.filter((c) => latest.has(c.id));

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
          <AudioPlayer
            ref={player}
            src={listenUrl}
            label={t.listen(label)}
            className="w-80 max-w-full"
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

      {comments.length > 0 && (
        <section
          aria-labelledby={`comments-${fileId}`}
          className="flex flex-col gap-2"
        >
          <h4
            id={`comments-${fileId}`}
            className="text-sm text-[color:var(--text-secondary)]"
          >
            {c.title(comments.length)}
          </h4>
          <ul className="flex flex-col gap-2">
            {shown.map((comment) => (
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
          {hidden > 0 && (
            <button
              type="button"
              aria-expanded={all}
              onClick={() => setAll((open) => !open)}
              className="self-start text-sm font-medium underline underline-offset-4"
            >
              {all ? c.showLess : c.showMore(hidden)}
            </button>
          )}
        </section>
      )}

      <div className="flex flex-wrap gap-2">
        <DialogButton
          label={c.add}
          variant="ghost"
          title={c.addTitle(label)}
          description={c.addHint}
        >
          {(close) => (
            <AudioCommentForm
              masterId={masterId}
              fileId={fileId}
              startSeconds={player.current?.currentTime ?? null}
              onDone={close}
            />
          )}
        </DialogButton>
        {decision}
      </div>
    </div>
  );
}
