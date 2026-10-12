"use client";

import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { ToneCallout } from "@/components/ui/tone-callout";
import { formatBriefDate } from "@/lib/framing/assess";
import { fr } from "@/lib/i18n/fr";
import { LAUNCHABLE, type PlanWorkflow } from "@/lib/plan/propose";

export type ReviewStep = {
  key: string;
  title: string;
  workflow: PlanWorkflow | null;
  column: string;
  removed: boolean;
  pilot: string;
  dueDate: string | null;
  note: boolean;
};

/**
 * The review before « Lancer le plan » (PROJ-UX-07): what starts now, what
 * waits for its go, what follows its own stage, the added steps, what was
 * removed, and how many inconsistencies are still said. Launching records
 * who confirmed it.
 */
export function PlanLaunchReview({
  steps,
  issueCount,
  pending,
  error,
  onConfirm,
  onCancel,
}: {
  steps: ReviewStep[];
  issueCount: number;
  pending: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const t = fr.planSteps.review;
  const kept = steps.filter((s) => !s.removed && !s.note);
  const launchable = (s: ReviewStep) =>
    s.workflow !== null && LAUNCHABLE.includes(s.workflow);
  const groups: Array<[string, ReviewStep[]]> = [
    [
      t.starts,
      kept.filter(
        (s) =>
          launchable(s) && (s.column === "focus" || s.column === "meanwhile"),
      ),
    ],
    [t.waits, kept.filter((s) => launchable(s) && s.column === "next")],
    [t.follows, kept.filter((s) => s.workflow !== null && !launchable(s))],
    [t.steps, kept.filter((s) => s.workflow === null)],
    [t.removed, steps.filter((s) => s.removed && !s.note)],
  ];
  return (
    <div className="flex flex-col gap-5">
      <dl className="flex flex-col gap-4">
        {groups.map(([label, list]) => (
          <div key={label} className="flex flex-col gap-1">
            <dt className="text-caption text-muted-foreground">{label}</dt>
            <dd>
              {list.length === 0 ? (
                <span className="text-body-md text-muted-foreground">
                  {t.none}
                </span>
              ) : (
                <ul className="flex flex-col gap-0.5 text-body-md font-semibold">
                  {list.map((s) => (
                    <li key={s.key} className="break-words">
                      {t.line(
                        s.title,
                        s.pilot,
                        s.dueDate ? formatBriefDate(s.dueDate) : null,
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </dd>
          </div>
        ))}
      </dl>
      {issueCount > 0 && (
        <ToneCallout tone="warning">{t.issues(issueCount)}</ToneCallout>
      )}
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" size="lg" onClick={onCancel}>
          {fr.dialogs.cancel}
        </Button>
        <Button
          type="button"
          size="lg"
          disabled={pending}
          aria-busy={pending || undefined}
          onClick={onConfirm}
        >
          {pending
            ? fr.framingIntel.plan.launching
            : fr.framingIntel.plan.launch}
        </Button>
      </div>
    </div>
  );
}
