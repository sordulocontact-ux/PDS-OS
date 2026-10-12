"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { ReportView } from "@/components/calls/closure/report-view";
import { ShareReportForm } from "@/components/calls/closure/share-report-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { DialogButton } from "@/components/ui/dialog-button";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { StatusBadge } from "@/components/ui/status-badge";
import { routes } from "@/lib/auth/redirects";
import { formatDay } from "@/lib/assistant/facts";
import { closeCall } from "@/lib/calls/closure-actions";
import type { CallClosure, CallShare } from "@/lib/calls/closure-queries";
import type { Member } from "@/lib/framing/related";
import { fr } from "@/lib/i18n/fr";

export type CallOutputs = {
  transcript: boolean;
  summary: boolean;
  decisions: number;
  actions: number;
  tasks: number;
  proposals: number;
  pendingProposals: number;
};

/**
 * The five outputs of a call and its closing (PROJ-AMEL-01): what is ready,
 * what is still to review, « Clôturer le call » (the report frozen as a
 * version, a correction makes the next one), the last version as it reads,
 * « Partager le compte rendu », its PDF, and the history.
 */
export function CallClosureCard({
  call,
  outputs,
  closures,
  shares,
  canEdit,
  members,
  guestEmails,
}: {
  call: { id: string; title: string; occurredAt: string };
  outputs: CallOutputs;
  closures: CallClosure[];
  shares: CallShare[];
  canEdit: boolean;
  members: Member[];
  guestEmails: string[];
}) {
  const t = fr.calls.closure;
  const latest = closures[0] ?? null;
  const unreviewed = {
    actions: outputs.actions - outputs.tasks,
    proposals: outputs.pendingProposals,
  };
  const rows: Array<[string, boolean]> = [
    [t.outputs.transcript, outputs.transcript],
    [t.outputs.summary, outputs.summary],
    [t.outputs.decisions(outputs.decisions), true],
    [
      t.outputs.actions(outputs.actions, outputs.tasks),
      unreviewed.actions === 0,
    ],
    [
      t.outputs.proposals(outputs.proposals, outputs.pendingProposals),
      unreviewed.proposals === 0,
    ],
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.title}</CardTitle>
        <CardDescription>{t.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <ul className="flex flex-col divide-y">
          {rows.map(([label, ready]) => (
            <li
              key={label}
              className="flex items-center justify-between gap-3 py-2"
            >
              <span className="text-body-md">{label}</span>
              <StatusBadge tone={ready ? "success" : "warning"} size="sm">
                {ready ? t.outputs.ready : t.outputs.missing}
              </StatusBadge>
            </li>
          ))}
        </ul>

        {latest && (
          <section className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              {t.closedOn(
                latest.version,
                formatDay(latest.closedAt),
                latest.closedByName,
              )}
              {latest.note ? ` — ${latest.note}` : ""}
            </p>
            {(latest.unreviewed.actions > 0 ||
              latest.unreviewed.proposals > 0) && (
              <p className="text-sm text-muted-foreground">
                {t.leftToReview(
                  t.unreviewed(
                    latest.unreviewed.actions,
                    latest.unreviewed.proposals,
                  ),
                )}
              </p>
            )}
            <ReportView content={latest.content} />
          </section>
        )}

        <div className="flex flex-wrap gap-2">
          {canEdit && (
            <DialogButton
              label={latest ? t.correct : t.close}
              variant={latest ? "outline" : "default"}
              title={t.closeTitle}
              description={t.closeBody}
            >
              {(close) => (
                <CloseForm
                  callId={call.id}
                  unreviewed={unreviewed}
                  onDone={close}
                />
              )}
            </DialogButton>
          )}
          {canEdit && latest && (
            <DialogButton
              label={t.share}
              title={t.shareTitle}
              description={t.shareBody}
              wide
            >
              {(close) => (
                <ShareReportForm
                  call={call}
                  closure={latest}
                  members={members}
                  guestEmails={guestEmails}
                  onDone={close}
                />
              )}
            </DialogButton>
          )}
          {latest && (
            <a
              href={routes.callReportPdf(call.id, latest.version, "full")}
              className={buttonVariants({ size: "sm", variant: "ghost" })}
            >
              {t.pdf}
            </a>
          )}
        </div>

        {(closures.length > 1 || shares.length > 0) && (
          <section className="flex flex-col gap-1.5">
            <h4 className="text-body-md font-semibold">{t.history}</h4>
            <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
              {[
                ...closures.map((c) => ({
                  at: c.closedAt,
                  text: t.closedOn(
                    c.version,
                    formatDay(c.closedAt),
                    c.closedByName,
                  ),
                })),
                ...shares.map((s) => ({
                  at: s.sharedAt,
                  text: t.sharedLine(
                    s.sharedByName,
                    formatDay(s.sharedAt),
                    t.scopes[s.scope],
                    s.recipients.join(", "),
                  ),
                })),
              ]
                .sort((a, b) => b.at.localeCompare(a.at))
                .map((line, i) => (
                  <li key={i}>{line.text}</li>
                ))}
            </ul>
          </section>
        )}
      </CardContent>
    </Card>
  );
}

function CloseForm({
  callId,
  unreviewed,
  onDone,
}: {
  callId: string;
  unreviewed: { actions: number; proposals: number };
  onDone: () => void;
}) {
  const t = fr.calls.closure;
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const left = unreviewed.actions > 0 || unreviewed.proposals > 0;
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const result = await closeCall(callId, note);
          if (!result.ok) return setError(result.error);
          toast.success(t.closed);
          onDone();
        });
      }}
    >
      <FormMessage kind="info">
        {left
          ? t.unreviewed(unreviewed.actions, unreviewed.proposals)
          : t.allReviewed}
      </FormMessage>
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <TextareaField
        name="note"
        label={t.noteLabel}
        rows={2}
        maxLength={1000}
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <DialogFormActions
        onCancel={onDone}
        submitLabel={t.close}
        pending={pending}
      />
    </form>
  );
}
