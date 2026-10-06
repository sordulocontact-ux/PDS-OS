"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { TextareaField } from "@/components/auth/textarea-field";
import { ContractSignatureStep } from "@/components/contracts/contract-signature-step";
import { ContractStateBadge } from "@/components/contracts/contract-state-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ToneCallout } from "@/components/ui/tone-callout";
import { advanceContract } from "@/lib/contracts/actions";
import type {
  ContractAction,
  ContractRights,
  ContractState,
} from "@/lib/contracts/types";
import { fr } from "@/lib/i18n/fr";
import { validationTone } from "@/lib/ui/state-tones";

/**
 * Where a contract stands and its next step, for whoever takes it: the owner
 * submits it, the director approves it or asks for changes (with a comment),
 * then the owner sends it and records the signature date. The database moves
 * the status (advance_contract); these buttons only ask.
 */
export function ContractFlow({
  contractId,
  state,
  can,
  lastReview,
  today,
  proof = null,
}: {
  contractId: string;
  state: ContractState;
  can: ContractRights;
  // The director's last decision, when it asked for changes or approved.
  lastReview: { comment: string | null; label: string } | null;
  // "YYYY-MM-DD" in Paris: the default signature date, and its maximum.
  today: string;
  // A contract generated from a template: its proof of signature.
  proof?: { missing: boolean } | null;
}) {
  const t = fr.contracts.flow;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [comment, setComment] = useState("");
  const [terminating, setTerminating] = useState(false);

  function run(
    action: ContractAction,
    extra?: { comment?: string; signedOn?: string },
  ) {
    startTransition(async () => {
      const result = await advanceContract({ contractId, action, ...extra });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(t.done[action]);
      setTerminating(false);
      router.refresh();
    });
  }

  const changesRequested = state === "draft" && lastReview?.comment;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>{t.title}</CardTitle>
          <ContractStateBadge state={state} size="md" />
        </div>
        <CardDescription>{t.steps[state]}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {changesRequested && (
          <ToneCallout tone={validationTone.rejected}>
            <span className="font-medium">{t.changesRequested}</span> —{" "}
            {lastReview.comment}
          </ToneCallout>
        )}
        {lastReview && (
          <p className="text-xs text-muted-foreground">{lastReview.label}</p>
        )}

        {can.submit && (
          <Button
            size="lg"
            className="justify-self-start"
            disabled={pending}
            onClick={() => run("submit")}
          >
            {t.submit}
          </Button>
        )}

        {can.decide && (
          <div className="grid gap-3">
            <TextareaField
              name="reviewComment"
              label={t.commentLabel}
              hint={t.commentHint}
              rows={3}
              maxLength={2000}
              value={comment}
              disabled={pending}
              onChange={(event) => setComment(event.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                size="lg"
                disabled={pending}
                onClick={() => run("approve", { comment })}
              >
                {t.approve}
              </Button>
              <Button
                size="lg"
                variant="outline"
                disabled={pending || comment.trim() === ""}
                onClick={() => run("request_changes", { comment })}
              >
                {t.requestChanges}
              </Button>
            </div>
          </div>
        )}

        {(can.send || can.sign) && (
          <ContractSignatureStep
            can={can}
            today={today}
            pending={pending}
            proof={proof}
            onSend={(note) => run("send", { comment: note })}
            onSign={(signedOn) => run("sign", { signedOn })}
          />
        )}

        {can.terminate && (
          <>
            <Button
              variant="outline"
              size="lg"
              className="justify-self-start"
              disabled={pending}
              onClick={() => setTerminating(true)}
            >
              {t.terminate}
            </Button>
            <ConfirmDialog
              open={terminating}
              onOpenChange={(open) =>
                !open && !pending && setTerminating(false)
              }
              title={t.confirmTerminateTitle}
              description={t.confirmTerminateBody}
              cancelLabel={t.cancel}
              closeLabel={t.close}
              confirmLabel={t.terminate}
              pendingLabel={t.terminate}
              pending={pending}
              destructive
              onConfirm={() => run("terminate")}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
