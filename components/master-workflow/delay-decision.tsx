"use client";

import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { ToneCallout } from "@/components/ui/tone-callout";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { masterDelay } from "@/lib/i18n/fr/master-delay";
import {
  applyDelayDates,
  escalateDelay,
  keepDelayDates,
} from "@/lib/master-workflow/engineer-thread-actions";

const fr = { masterDelay };

const t = fr.masterDelay;

/**
 * What to do with a delay (proto `master:thread`): the owner applies the
 * dates, keeps them (saying why), or sends it to the direction when the
 * Master final would pass the release; the direction then applies them
 * (the release is to review) or refuses the delay. Each answer is read by
 * the engineer on their link.
 */
export function DelayDecision({
  projectId,
  messageId,
  status,
  engineer,
  beyondRelease,
  canMove,
  isOwner,
  isDirection,
  direction,
}: {
  projectId: string;
  messageId: string;
  status: "open" | "escalated";
  engineer: string;
  beyondRelease: boolean;
  // Some date is touched: there is something to apply.
  canMove: boolean;
  isOwner: boolean;
  isDirection: boolean;
  direction: string;
}) {
  const [reply, setReply] = useState("");
  const [why, setWhy] = useState(false);
  const submit = useWriteSubmit(() => {
    setReply("");
    setWhy(false);
  }, t.answered);
  const decides =
    (status === "open" && isOwner) || (status === "escalated" && isDirection);
  if (!decides)
    return status === "escalated" ? (
      <ToneCallout tone="danger">{t.atDirection(direction)}</ToneCallout>
    ) : null;

  const keep = () => {
    if (!reply.trim()) return setWhy(true);
    submit.run(() => keepDelayDates(projectId, messageId, reply), t.answered);
  };
  return (
    <div className="flex flex-col gap-3">
      <TextareaField
        name={`reply-${messageId}`}
        label={t.replyTo(engineer)}
        rows={2}
        maxLength={2000}
        placeholder={
          status === "escalated"
            ? t.replyPlaceholderDirection
            : t.replyPlaceholder
        }
        value={reply}
        error={why && !reply.trim() ? t.keepWhy(engineer) : undefined}
        onChange={(e) => setReply(e.target.value)}
      />
      {submit.error && <FormMessage kind="error">{submit.error}</FormMessage>}
      <div className="flex flex-wrap gap-2">
        {status === "open" && beyondRelease ? (
          <Button
            size="sm"
            disabled={submit.pending}
            onClick={() =>
              submit.run(() => escalateDelay(projectId, messageId), t.escalated)
            }
          >
            {t.escalate}
          </Button>
        ) : (
          canMove && (
            <Button
              size="sm"
              disabled={submit.pending}
              onClick={() =>
                submit.run(
                  () => applyDelayDates(projectId, messageId, reply),
                  t.applied,
                )
              }
            >
              {status === "escalated" ? t.applyDirection : t.apply}
            </Button>
          )
        )}
        <Button
          size="sm"
          variant="outline"
          disabled={submit.pending}
          onClick={keep}
        >
          {status === "escalated" ? t.refuse : t.keep}
        </Button>
      </div>
    </div>
  );
}
