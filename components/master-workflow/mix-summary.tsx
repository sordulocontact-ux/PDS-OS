"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/calls/format";
import { fr } from "@/lib/i18n/fr";
import {
  proposeMixSummary,
  saveMixSummary,
  sendMixFeedback,
  type MixResult,
} from "@/lib/master-workflow/mix-actions";
import type { MixVersion } from "@/lib/master-workflow/mix-types";

/**
 * The synthesis for the engineer: read-only once sent; before, for the
 * owner, a field PO may fill from the comments ("Proposer une synthèse"),
 * then "Enregistrer la synthèse" and "Transmettre les retours".
 */
export function MixSummary({
  projectId,
  version,
  canEdit,
}: {
  projectId: string;
  version: MixVersion;
  canEdit: boolean;
}) {
  const t = fr.masterWorkflow.mixVersions;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [summary, setSummary] = useState(version.feedbackSummary ?? "");
  const run = (action: () => Promise<MixResult>, done: string) =>
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(done);
      router.refresh();
    });

  if (version.feedbackSentAt)
    return (
      <section className="grid gap-1">
        <h4 className="text-sm font-medium">
          {t.sent(formatDateTime(version.feedbackSentAt))}
        </h4>
        <p className="text-sm whitespace-pre-wrap">{version.feedbackSummary}</p>
      </section>
    );
  if (!canEdit) return null;

  return (
    <section className="grid gap-2">
      <TextareaField
        id={`summary-${version.id}`}
        name="summary"
        label={t.summary}
        hint={t.summaryHint}
        rows={4}
        maxLength={4000}
        value={summary}
        onChange={(event) => setSummary(event.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending || version.comments.length === 0}
          onClick={() =>
            startTransition(async () => {
              const result = await proposeMixSummary(projectId, version.id);
              if (result.ok) setSummary(result.summary);
              else toast.error(result.error);
            })
          }
        >
          {pending ? t.proposing : t.propose}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() =>
            run(() => saveMixSummary(projectId, version.id, summary), t.saved)
          }
        >
          {t.save}
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={pending || !version.feedbackSummary}
          onClick={() =>
            run(() => sendMixFeedback(projectId, version.id), t.sentToast)
          }
        >
          {t.send}
        </Button>
      </div>
    </section>
  );
}
