"use client";

import { AskPoButton } from "@/components/assistant/ask-po-button";
import { RecommendationTaskForm } from "@/components/strategy/follow-up/recommendation-task-form";
import { DialogButton } from "@/components/ui/dialog-button";
import { ReasonForm } from "@/components/ui/reason-form";
import { StatusBadge } from "@/components/ui/status-badge";
import { routes } from "@/lib/auth/redirects";
import { formatBriefDate } from "@/lib/framing/assess";
import type { Member } from "@/lib/framing/related";
import { writtenOf } from "@/lib/framing/written";
import { strategyFollowUp } from "@/lib/i18n/fr/strategy-follow-up";
import { ignoreRecommendation } from "@/lib/strategy/actions/follow-up";
import {
  recommendationAnchor,
  type Recommendation,
} from "@/lib/strategy/recommendations";
import { recommendationLevelTone } from "@/lib/ui/state-tones";

const fr = { strategyFollowUp };

/**
 * A recommendation computed from real data (ticket § 14, MKT-C2-02): its
 * level and where it comes from, the data it rests on, why the code raised
 * it and what it changes for the project, the action proposed; then, for
 * the owner, « Créer la tâche » (prefilled, corrected, linked both ways)
 * or « Ignorer » with a reason, and for everyone « Parler à PO », whose
 * conversation keeps the way back here. Readers are told why they cannot
 * act rather than finding the buttons missing.
 */
export function RecommendationCard({
  projectId,
  projectTitle,
  recommendation,
  canAct,
  members,
  ownerId,
  today,
}: {
  projectId: string;
  projectTitle: string;
  recommendation: Recommendation;
  canAct: boolean;
  members: Member[];
  ownerId: string | null;
  today: string;
}) {
  const t = fr.strategyFollowUp.recommendations;
  const rec = recommendation;
  const level = t.levels[rec.level];
  const basis =
    rec.task.dueBasis.kind === "milestone"
      ? t.basis.milestone(rec.task.dueBasis.title)
      : t.basis.week;
  const assignee =
    members.find((m) => m.personId === rec.task.assigneeId) ??
    members.find((m) => m.personId === ownerId);
  const anchor = recommendationAnchor(rec.ruleKey);

  return (
    <li
      id={anchor}
      // A row of the recommendations' `Rows` (its frame and hairlines).
      className="flex scroll-mt-6 flex-col gap-3 p-3.5 modern:p-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge tone={recommendationLevelTone[rec.level]} size="sm">
          {level}
        </StatusBadge>
        <span className="text-caption text-muted-foreground">
          {t.sources[rec.rule]}
        </span>
      </div>
      <p className="text-body-md font-semibold">{rec.text}</p>
      <div className="flex flex-col gap-1 text-caption text-muted-foreground">
        <p>{t.why[rec.rule]}</p>
        <p>{t.effect[rec.level]}</p>
      </div>
      <p className="text-body-md">{t.proposedAction(rec.action)}</p>
      {canAct ? (
        <p className="text-caption text-muted-foreground">
          {t.proposal(
            assignee?.name ?? t.noAssignee,
            formatBriefDate(rec.task.dueOn),
            basis,
          )}
        </p>
      ) : (
        <p className="text-caption text-muted-foreground">{t.readOnly}</p>
      )}
      <div className="flex flex-wrap gap-2">
        {canAct && (
          <>
            <DialogButton
              label={t.task.open}
              variant="default"
              title={t.task.title}
              description={t.task.body}
            >
              {(close) => (
                <RecommendationTaskForm
                  projectId={projectId}
                  recommendation={rec}
                  members={members}
                  ownerId={ownerId}
                  today={today}
                  basis={basis}
                  onDone={close}
                />
              )}
            </DialogButton>
            <DialogButton
              label={t.ignore.open}
              title={t.ignore.title}
              description={t.ignore.body}
            >
              {(close) => (
                <ReasonForm
                  label={t.ignore.reason}
                  submitLabel={t.ignore.submit}
                  doneMessage={t.ignore.done}
                  run={(reason) =>
                    writtenOf(
                      ignoreRecommendation({
                        projectId,
                        ruleKey: rec.ruleKey,
                        reason,
                      }),
                    )
                  }
                  onDone={close}
                />
              )}
            </DialogButton>
          </>
        )}
        <AskPoButton
          // In text beside « Ignorer », outlined when it is alone.
          variant={canAct ? "ghost" : "outline"}
          question={rec.question}
          label={t.askPo}
          origin={{
            href: `${routes.projectStrategyFollowUp(projectId)}#${anchor}`,
            trail: t.trail(projectTitle, level),
          }}
        />
      </div>
    </li>
  );
}
