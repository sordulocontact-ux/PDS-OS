"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormDialog } from "@/components/ui/form-dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateTime } from "@/lib/calls/format";
import { fr } from "@/lib/i18n/fr";
import { decideMixVersion } from "@/lib/master-workflow/mix-actions";
import type { MixVersion, VersionStage } from "@/lib/master-workflow/mix-types";

/**
 * The validator's decision on a version (ticket § 11): the decision once
 * taken (never changed), or, on the latest undecided version and for the
 * validator only, "Valider ce mix" (confirmed: it is definitive) and
 * "Demander une modification" (with an optional note).
 */
export function MixDecision({
  projectId,
  title,
  version,
  isLatest,
  canDecide,
  finalNumber,
  stage,
}: {
  projectId: string;
  title: string;
  version: MixVersion;
  isLatest: boolean;
  canDecide: boolean;
  // The title's validated version at this stage (Mix final, Master final).
  finalNumber: number | null;
  stage: VersionStage;
}) {
  const t = fr.masterWorkflow.mixVersions;
  const s = t.stages[stage];
  const router = useRouter();
  const [dialog, setDialog] = useState<"approve" | "request" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const decide = (decision: "approved" | "changes_requested", note: string) =>
    startTransition(async () => {
      setError(null);
      const result = await decideMixVersion(
        projectId,
        version.id,
        decision,
        note,
      );
      if (!result.ok) {
        // Kept in the dialog that asked (a toast under a modal goes unseen).
        setError(result.error);
        return;
      }
      setDialog(null);
      router.refresh();
    });

  if (version.decision && version.decidedAt)
    return (
      <div className="grid gap-1">
        <StatusBadge
          tone={version.decision === "approved" ? "success" : "warning"}
          className="w-fit"
        >
          {(version.decision === "approved"
            ? s.approved
            : t.decisions.changes_requested)(
            formatDateTime(version.decidedAt),
            version.decidedBy,
          )}
        </StatusBadge>
        {version.decisionNote && (
          <p className="text-sm whitespace-pre-wrap">{version.decisionNote}</p>
        )}
        <p className="text-caption text-[color:var(--text-secondary)]">
          {t.engineerSees}
        </p>
      </div>
    );
  if (finalNumber !== null && version.number > finalNumber)
    return (
      <p className="text-sm text-[color:var(--text-secondary)]">
        {s.afterFinal(finalNumber)}
      </p>
    );
  if (!isLatest || !canDecide || finalNumber !== null) return null;

  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" onClick={() => setDialog("approve")}>
        {s.approve}
      </Button>
      <Button variant="outline" size="sm" onClick={() => setDialog("request")}>
        {t.requestChange}
      </Button>
      <ConfirmDialog
        open={dialog === "approve"}
        onOpenChange={(open) => setDialog(open ? "approve" : null)}
        title={s.approveTitle(title, version.number)}
        description={s.approveDescription}
        cancelLabel={t.cancel}
        closeLabel={t.close}
        confirmLabel={s.approveConfirm}
        pendingLabel={t.approving}
        pending={pending}
        destructive
        error={error}
        onConfirm={() => decide("approved", "")}
      />
      <FormDialog
        open={dialog === "request"}
        onOpenChange={(open) => setDialog(open ? "request" : null)}
        title={t.requestTitle}
        description={t.requestDescription}
        closeLabel={t.close}
      >
        <form
          className="flex flex-col gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            decide(
              "changes_requested",
              String(new FormData(event.currentTarget).get("note") ?? ""),
            );
          }}
        >
          <TextareaField
            name="note"
            label={t.requestNote}
            hint={
              version.feedbackSentAt
                ? t.requestNoteComplement
                : version.feedbackSummary
                  ? t.requestNoteSaved
                  : t.requestNoteRequired
            }
            rows={3}
            maxLength={2000}
            required={!version.feedbackSentAt && !version.feedbackSummary}
          />
          {error && <FormMessage kind="error">{error}</FormMessage>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={() => setDialog(null)}
            >
              {t.cancel}
            </Button>
            <Button type="submit" size="lg" disabled={pending}>
              {t.requestSubmit}
            </Button>
          </div>
        </form>
      </FormDialog>
    </div>
  );
}
