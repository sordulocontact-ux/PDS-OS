"use client";

import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import {
  createBriefVersion,
  sendBriefVersion,
} from "@/lib/framing/actions/brief-step";
import { fr } from "@/lib/i18n/fr";

/**
 * The owner's gesture on the Brief, in the step (proto frBrief): create
 * it (or its next version, or update it when the Cadrage changed since),
 * or send it to the direction. A version that says what the last one sent
 * said goes only with a written reason (PROJ-BUG-05).
 */
export function BriefOwnerStep({
  projectId,
  action,
}: {
  projectId: string;
  action:
    | { kind: "create"; label: string }
    | {
        kind: "send";
        briefId: string;
        validatorName: string;
        unchangedFrom: number | null;
      };
}) {
  const tu = fr.briefRequests.unchanged;
  const [reason, setReason] = useState("");
  const [tried, setTried] = useState(false);
  const { pending, error, run } = useWriteSubmit(
    () => setReason(""),
    action.kind === "create"
      ? fr.framingJourney.done.briefCreated
      : fr.framingJourney.done.briefSent,
  );
  if (action.kind === "create")
    return (
      <div className="flex flex-col gap-2">
        <div>
          <Button
            disabled={pending}
            aria-busy={pending || undefined}
            onClick={() => run(() => createBriefVersion(projectId))}
          >
            {pending ? fr.framingJourney.brief.creating : action.label}
          </Button>
        </div>
        <FormMessage kind="error">{error}</FormMessage>
      </div>
    );
  const needsReason = action.unchangedFrom !== null;
  const missing = tried && needsReason && !reason.trim();
  return (
    <div className="flex flex-col gap-3">
      {needsReason && (
        <p className="text-caption text-[color:var(--text-secondary)]">
          {tu.warning(action.unchangedFrom ?? 0)}
        </p>
      )}
      {needsReason && (
        <TextareaField
          id="brief-unchanged-reason"
          name="reason"
          label={tu.reasonLabel}
          rows={2}
          maxLength={1000}
          required
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          error={
            missing ? fr.framingIntel.answerStates.reasonRequired : undefined
          }
        />
      )}
      <FormMessage kind="error">{error}</FormMessage>
      <div>
        <Button
          disabled={pending}
          aria-busy={pending || undefined}
          onClick={() => {
            setTried(true);
            if (needsReason && !reason.trim()) {
              document.getElementById("brief-unchanged-reason")?.focus();
              return;
            }
            run(() => sendBriefVersion(projectId, action.briefId, reason));
          }}
        >
          {pending
            ? fr.framingJourney.brief.sending
            : fr.framingJourney.brief.sendTo(action.validatorName)}
        </Button>
      </div>
    </div>
  );
}
