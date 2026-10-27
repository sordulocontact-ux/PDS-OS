"use client";

import { useState, useTransition } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { DialogButton } from "@/components/ui/dialog-button";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { legalSplits } from "@/lib/i18n/fr/legal-splits";
import type { PublicSplit as Split } from "@/lib/legal/splits/public";
import { answerSplit } from "@/lib/legal/splits/public-actions";
import { formatShare, unitsOf } from "@/lib/legal/splits/shares";
import { cn } from "@/lib/utils";

const fr = { legalSplits };

type Open = Extract<Split, { state: "open" }>;

/**
 * The whole proposal, the person's own line marked, then « Je confirme » or
 * « Je conteste » (with what does not suit them). The answer carries the
 * hash of what was shown: a proposal changed meanwhile is refused.
 */
export function PublicSplit({ token, split }: { token: string; split: Open }) {
  const t = fr.legalSplits.public;
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<"confirm" | "dispute" | null>(null);
  const [pending, startTransition] = useTransition();

  const send = (decision: "confirm" | "dispute", comment: string) =>
    startTransition(async () => {
      setError(null);
      const result = await answerSplit({
        token,
        decision,
        comment,
        hash: split.hash,
      });
      if (result.ok) setDone(result.decision);
      else setError(result.error);
    });

  if (done)
    return (
      <p
        className="rounded-2xl border bg-background p-6 font-medium"
        role="status"
      >
        {done === "confirm" ? t.done.confirmed : t.done.disputed}
      </p>
    );

  return (
    <div className="flex flex-col gap-5 rounded-2xl border bg-background p-6">
      <ul className="flex flex-col divide-y">
        {split.content.entries.map((entry, i) => {
          const mine = i + 1 === split.position;
          return (
            <li
              key={`${entry.name}-${i}`}
              className={cn(
                "flex items-baseline justify-between gap-4 py-3",
                mine && "font-semibold",
              )}
            >
              <span className="min-w-0 break-words">
                {entry.name}
                {mine && (
                  <span className="text-muted-foreground"> · {t.you}</span>
                )}
                <span className="block text-sm font-medium text-muted-foreground">
                  {entry.represents?.length
                    ? fr.legalSplits.editor.represents(entry.represents)
                    : fr.legalSplits.roles[entry.role]}
                </span>
              </span>
              <span className="shrink-0 tabular-nums">
                {formatShare(unitsOf(entry.share) ?? 0)}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="text-sm text-muted-foreground">{t.notice}</p>
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {/* Contesting asks why: a dialog (proto Juridique v3). */}
        <DialogButton
          label={t.dispute}
          variant="outline"
          size="lg"
          title={t.disputeTitle}
          description={t.disputeBody}
        >
          {(close) => (
            <DisputeForm
              pending={pending}
              error={error}
              onSend={(comment) => send("dispute", comment)}
              onCancel={close}
            />
          )}
        </DialogButton>
        <Button
          size="lg"
          disabled={pending}
          aria-busy={pending || undefined}
          onClick={() => send("confirm", "")}
        >
          {pending ? t.sending : t.confirm}
        </Button>
      </div>
    </div>
  );
}

/** Why the person contests: required, said on « Envoyer ma contestation ». */
function DisputeForm({
  pending,
  error,
  onSend,
  onCancel,
}: {
  pending: boolean;
  error: string | null;
  onSend: (comment: string) => void;
  onCancel: () => void;
}) {
  const t = fr.legalSplits.public;
  const [comment, setComment] = useState("");
  const [tried, setTried] = useState(false);
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setTried(true);
        if (comment.trim()) onSend(comment);
      }}
    >
      <TextareaField
        name="comment"
        label={t.disputeLabel}
        aria-required
        rows={3}
        maxLength={2000}
        value={comment}
        error={tried && !comment.trim() ? t.commentRequired : undefined}
        onChange={(event) => setComment(event.target.value)}
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={t.sendDispute}
        onCancel={onCancel}
      />
    </form>
  );
}
