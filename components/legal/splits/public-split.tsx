"use client";

import { useState, useTransition } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { fr } from "@/lib/i18n/fr";
import type { PublicSplit as Split } from "@/lib/legal/splits/public";
import { answerSplit } from "@/lib/legal/splits/public-actions";
import { formatShare, unitsOf } from "@/lib/legal/splits/shares";
import { cn } from "@/lib/utils";

type Open = Extract<Split, { state: "open" }>;

/**
 * The whole proposal, the person's own line marked, then « Je confirme » or
 * « Je conteste » (with what does not suit them). The answer carries the
 * hash of what was shown: a proposal changed meanwhile is refused.
 */
export function PublicSplit({ token, split }: { token: string; split: Open }) {
  const t = fr.legalSplits.public;
  const [disputing, setDisputing] = useState(false);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<"confirm" | "dispute" | null>(null);
  const [pending, startTransition] = useTransition();

  const send = (decision: "confirm" | "dispute") =>
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
                  {fr.legalSplits.roles[entry.role]}
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
      {disputing && (
        <TextareaField
          name="comment"
          label={t.disputeLabel}
          rows={3}
          maxLength={2000}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
        />
      )}
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {disputing ? (
          <>
            <Button
              variant="ghost"
              size="lg"
              disabled={pending}
              onClick={() => setDisputing(false)}
            >
              {t.cancel}
            </Button>
            <Button
              size="lg"
              disabled={pending || !comment.trim()}
              aria-busy={pending || undefined}
              onClick={() => send("dispute")}
            >
              {pending ? t.sending : t.sendDispute}
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="outline"
              size="lg"
              disabled={pending}
              onClick={() => setDisputing(true)}
            >
              {t.dispute}
            </Button>
            <Button
              size="lg"
              disabled={pending}
              aria-busy={pending || undefined}
              onClick={() => send("confirm")}
            >
              {pending ? t.sending : t.confirm}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
