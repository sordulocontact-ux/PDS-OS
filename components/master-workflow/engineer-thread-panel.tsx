"use client";

import { useState, useTransition } from "react";
import { toast } from "@/components/ui/toast";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { PageSection } from "@/components/shell/page-section";
import { EmptyNote } from "@/components/shell/empty-state";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Timestamp } from "@/components/ui/timestamp";
import { ToneCallout } from "@/components/ui/tone-callout";
import { formatBriefDate } from "@/lib/framing/assess";
import { masterDelay } from "@/lib/i18n/fr/master-delay";
import { masterWorkflow } from "@/lib/i18n/fr/master-workflow";
import { formatDay } from "@/lib/utils/day";
import type { BriefDate } from "@/lib/master-workflow/brief-types";
import { delayImpact } from "@/lib/master-workflow/delay-impact";
import {
  replyToEngineer,
  setSignalStatus,
} from "@/lib/master-workflow/engineer-thread-actions";
import type { TeamEngineerMessage } from "@/lib/master-workflow/engineer-thread";
import { engineerSignalTone } from "@/lib/ui/state-tones";

import { DelayDecision } from "./delay-decision";

const fr = { masterWorkflow, masterDelay };

/**
 * « Fil avec l'ingénieur » (PROJ-AMEL-02): the engineer's questions,
 * delays and missing files, dated and staged, with the team's answers. The
 * owner answers, handles a signal, and for a delay sees the dates it
 * touches (computed by the code) before applying them: nothing moves by
 * itself.
 */
export function EngineerThreadPanel({
  projectId,
  messages,
  dates,
  releaseDue,
  today,
  replyTo,
  canEdit,
  isDirection = false,
  direction,
  engineer,
}: {
  projectId: string;
  messages: TeamEngineerMessage[];
  dates: Record<BriefDate, string | null>;
  releaseDue: string | null;
  // "YYYY-MM-DD" in Paris, from the server.
  today: string;
  // The sending an answer goes to (the latest); null: none yet.
  replyTo: string | null;
  canEdit: boolean;
  // The direction decides a delay the owner sent to it.
  isDirection?: boolean;
  direction: string;
  engineer: string;
}) {
  const t = fr.masterWorkflow.engineerThread;
  const labels = fr.masterWorkflow.brief.fields;
  const [body, setBody] = useState("");
  const [tried, setTried] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (
    action: () => Promise<{ ok: true } | { ok: false; error: string }>,
    done: string,
    after?: () => void,
  ) =>
    startTransition(async () => {
      const result = await action();
      if (!result.ok) return setError(result.error);
      setError(null);
      after?.();
      toast.success(done);
    });

  if (messages.length === 0 && !replyTo) return null;
  return (
    <PageSection
      card
      id="engineer-thread"
      title={t.teamTitle}
      description={t.teamDescription}
    >
      {error && <FormMessage kind="error">{error}</FormMessage>}
      {messages.length === 0 ? (
        <EmptyNote>{t.empty}</EmptyNote>
      ) : (
        <ol className="flex flex-col divide-y">
          {messages.map((m) => {
            const impact =
              m.kind === "delay" &&
              m.delayDays &&
              (m.status === "open" || m.status === "escalated")
                ? delayImpact({
                    stage: m.stage,
                    days: m.delayDays,
                    dates,
                    today,
                    releaseDate: releaseDue,
                  })
                : null;
            return (
              <li key={m.id} className="flex flex-col gap-2 py-3">
                <p className="flex flex-wrap items-center gap-2 text-caption text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {m.author === "engineer"
                      ? t.engineer
                      : (m.authorName ?? t.label)}
                  </span>
                  <Timestamp iso={m.createdAt} show="short" />
                  <span>· {t.stages[m.stage]}</span>
                  {m.kind !== "message" && (
                    <StatusBadge
                      tone={engineerSignalTone[m.status ?? "open"]}
                      size="sm"
                    >
                      {t.kinds[m.kind]}
                      {m.delayDays ? ` · ${t.days(m.delayDays)}` : ""}
                      {" · "}
                      {fr.masterDelay.statuses[m.status ?? "open"]}
                    </StatusBadge>
                  )}
                </p>
                <p className="text-body-md whitespace-pre-wrap">{m.body}</p>
                {impact && (
                  <div className="flex flex-col gap-1.5 rounded-xl bg-[var(--surface-tint)] px-3 py-2">
                    <p className="text-sm font-medium">{t.impactTitle}</p>
                    {impact.impacts.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        {t.impactNone}
                      </p>
                    ) : (
                      <>
                        <p className="text-sm text-muted-foreground">
                          {t.impactIntro(t.days(m.delayDays!))}
                        </p>
                        <ul className="flex list-disc flex-col gap-0.5 pl-5 text-sm tabular-nums">
                          {impact.impacts.map((i) => (
                            <li key={i.key}>
                              {t.impactLine(
                                labels[i.key],
                                formatBriefDate(i.from),
                                formatBriefDate(i.to),
                              )}
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                    {impact.beyondRelease && (
                      <ToneCallout tone="danger">
                        {fr.masterDelay.beyond(
                          formatDay(
                            impact.impacts.find(
                              (i) => i.key === "masterFinalDue",
                            )?.to ?? "",
                          ),
                          formatDay(releaseDue ?? ""),
                        )}
                      </ToneCallout>
                    )}
                  </div>
                )}
                {m.kind === "delay" && m.outcome && (
                  <p className="text-sm text-muted-foreground">
                    {m.outcome === "applied"
                      ? fr.masterDelay.outcomes.applied(
                          t.days(m.delayDays ?? 0),
                          m.handledBy,
                        )
                      : fr.masterDelay.outcomes[m.outcome](m.handledBy)}
                  </p>
                )}
                {impact &&
                  (m.status === "open" || m.status === "escalated") && (
                    <DelayDecision
                      projectId={projectId}
                      messageId={m.id}
                      status={m.status}
                      engineer={engineer}
                      beyondRelease={impact.beyondRelease}
                      canMove={impact.impacts.length > 0}
                      isOwner={canEdit}
                      isDirection={isDirection}
                      direction={direction}
                    />
                  )}
                {canEdit && m.kind !== "message" && m.kind !== "delay" && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() =>
                        run(
                          () =>
                            setSignalStatus(
                              projectId,
                              m.id,
                              m.status === "handled" ? "open" : "handled",
                            ),
                          t.handled,
                        )
                      }
                    >
                      {m.status === "handled" ? t.reopen : t.handle}
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
      {/* A reply answers something: only once the engineer wrote. */}
      {canEdit && replyTo && messages.some((m) => m.author === "engineer") && (
        <form
          noValidate
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            setTried(true);
            if (!body.trim()) return;
            run(
              () => replyToEngineer(projectId, replyTo, body),
              t.replied,
              () => {
                setBody("");
                setTried(false);
              },
            );
          }}
        >
          <TextareaField
            name="reply"
            label={t.replyLabel}
            aria-required
            rows={2}
            maxLength={2000}
            value={body}
            error={tried && !body.trim() ? t.invalid : undefined}
            onChange={(e) => setBody(e.target.value)}
          />
          <Button
            type="submit"
            size="sm"
            className="self-start"
            disabled={pending}
          >
            {t.reply}
          </Button>
        </form>
      )}
    </PageSection>
  );
}
