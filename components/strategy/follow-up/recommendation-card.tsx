"use client";

import { toast } from "sonner";

import { AskPoButton } from "@/components/assistant/ask-po-button";
import { useFramingAction } from "@/components/framing/use-framing-action";
import { Button } from "@/components/ui/button";
import { fr } from "@/lib/i18n/fr";
import {
  applyRecommendation,
  ignoreRecommendation,
} from "@/lib/strategy/actions/follow-up";
import type { Recommendation } from "@/lib/strategy/follow-up-results";

/**
 * A recommendation computed from real data (ticket § 14): the data it rests
 * on, the action proposed, then Appliquer (a task for the owner), Ignorer
 * (not offered again) or Parler à PO. Readers only talk to PO.
 */
export function RecommendationCard({
  projectId,
  recommendation,
  canAct,
}: {
  projectId: string;
  recommendation: Recommendation;
  canAct: boolean;
}) {
  const t = fr.strategyFollowUp.recommendations;
  const { pending, run } = useFramingAction();
  return (
    <li className="flex flex-col gap-3 rounded-2xl bg-[var(--tone-warning-bg)] p-4">
      <p className="text-body-md font-semibold text-[color:var(--tone-warning-fg)]">
        {recommendation.text}
      </p>
      <p className="text-caption text-muted-foreground">
        {recommendation.action}
      </p>
      <div className="flex flex-wrap gap-2">
        {canAct && (
          <>
            <Button
              size="sm"
              disabled={pending}
              title={t.applyHint}
              onClick={() =>
                run(
                  () => applyRecommendation(projectId, recommendation.ruleKey),
                  () => toast.success(t.applied),
                )
              }
            >
              {t.apply}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() =>
                run(() =>
                  ignoreRecommendation(projectId, recommendation.ruleKey),
                )
              }
            >
              {t.ignore}
            </Button>
          </>
        )}
        <AskPoButton question={recommendation.question} label={t.askPo} />
      </div>
    </li>
  );
}
