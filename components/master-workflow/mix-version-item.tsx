"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Field } from "@/components/auth/field";
import { TextareaField } from "@/components/auth/textarea-field";
import { MixDecision } from "@/components/master-workflow/mix-decision";
import { MixSummary } from "@/components/master-workflow/mix-summary";
import { AudioFile } from "@/components/ui/audio-file";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateTime } from "@/lib/calls/format";
import { fr } from "@/lib/i18n/fr";
import {
  addMixComment,
  type MixResult,
} from "@/lib/master-workflow/mix-actions";
import {
  commentSent,
  formatTimecode,
  parseTimecode,
  type MixVersion,
  type VersionStage,
} from "@/lib/master-workflow/mix-types";
import { mixVersionTone } from "@/lib/ui/state-tones";

/**
 * A version of the mix: who added it and when, the team's comments (every
 * member who sees the project adds one), the validator's decision
 * (MixDecision), then the synthesis for the engineer (MixSummary).
 */
export function MixVersionItem({
  projectId,
  title,
  version,
  canEdit,
  decision,
}: {
  projectId: string;
  title: string;
  version: MixVersion;
  // The project's owner: writes and sends the synthesis.
  canEdit: boolean;
  // Who decides and where the title stands (MixDecision).
  decision: {
    isLatest: boolean;
    canDecide: boolean;
    finalNumber: number | null;
    stage: VersionStage;
  };
}) {
  const t = fr.masterWorkflow.mixVersions;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const commentForm = useRef<HTMLFormElement>(null);
  // One key per comment being written: sent twice, it is added once.
  const [clientKey, setClientKey] = useState(() => crypto.randomUUID());
  const [timecodeError, setTimecodeError] = useState<string | undefined>();
  const run = (action: () => Promise<MixResult>) =>
    startTransition(async () => {
      const result = await action();
      if (!result.ok) toast.error(result.error);
      else router.refresh();
    });

  return (
    <article className="grid gap-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium">
            {t.version(version.number)} · {version.fileName}
          </p>
          <p className="text-caption text-[color:var(--text-secondary)]">
            {t.received(formatDateTime(version.createdAt), version.createdBy)}
          </p>
        </div>
        <StatusBadge tone={mixVersionTone[version.status]}>
          {t.statuses[version.status]}
        </StatusBadge>
      </header>

      <AudioFile
        label={t.listen(version.number)}
        listenUrl={version.openUrl}
        downloadUrl={version.downloadUrl}
      />

      <MixDecision
        projectId={projectId}
        title={title}
        version={version}
        {...decision}
      />

      <section className="grid gap-2" aria-label={t.comments}>
        <h4 className="text-sm font-medium">{t.comments}</h4>
        {version.comments.length === 0 ? (
          <p className="text-sm text-[color:var(--text-secondary)]">
            {t.noComment}
          </p>
        ) : (
          <ul className="grid gap-2">
            {version.comments.map((comment) => (
              <li key={comment.id} className="text-sm">
                <span className="font-medium">{comment.author}</span>
                <span className="text-[color:var(--text-secondary)]">
                  {" "}
                  · {formatDateTime(comment.createdAt)}
                  {comment.timecodeSeconds !== null &&
                    ` · ${t.at(formatTimecode(comment.timecodeSeconds))}`}
                  {" · "}
                  {commentSent(comment, version)
                    ? t.commentSent
                    : t.commentNotSent}
                </span>
                <p className="whitespace-pre-wrap">{comment.body}</p>
              </li>
            ))}
          </ul>
        )}
        {!version.feedbackSentAt && (
          <form
            ref={commentForm}
            className="grid gap-2"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              const body = String(data.get("body") ?? "");
              const timecode = parseTimecode(
                String(data.get("timecode") ?? ""),
              );
              if (Number.isNaN(timecode)) {
                setTimecodeError(t.timecodeInvalid);
                return;
              }
              setTimecodeError(undefined);
              run(async () => {
                const result = await addMixComment(
                  projectId,
                  version.id,
                  body,
                  timecode,
                  clientKey,
                );
                if (result.ok) {
                  commentForm.current?.reset();
                  setClientKey(crypto.randomUUID());
                }
                return result;
              });
            }}
          >
            <TextareaField
              id={`comment-${version.id}`}
              name="body"
              label={t.commentLabel}
              hint={t.commentHint}
              rows={2}
              maxLength={2000}
              required
            />
            <Field
              id={`timecode-${version.id}`}
              name="timecode"
              label={t.timecode}
              hint={t.timecodeHint}
              inputMode="numeric"
              autoComplete="off"
              error={timecodeError}
            />
            <div>
              <Button
                type="submit"
                variant="outline"
                size="sm"
                disabled={pending}
              >
                {t.commentSubmit}
              </Button>
            </div>
          </form>
        )}
      </section>

      <MixSummary projectId={projectId} version={version} canEdit={canEdit} />
    </article>
  );
}
