"use client";

import { ConfirmButton } from "@/components/ui/confirm-button";
import { strategyBriefOut } from "@/lib/i18n/fr/strategy-brief-out";
import { withdrawStrategyReviewer } from "@/lib/strategy/actions/brief-out";

const fr = { strategyBriefOut };

/**
 * « Retirer <Nom> » next to « Relancer » (Maël's test of 26/11/2026): a
 * creative asked to validate a strategy document who will not answer (left
 * the project, unavailable) stops holding the version back. Asked first:
 * they cannot be asked again on this version.
 */
export function WithdrawReviewer({
  projectId,
  reviewId,
  name,
  size = "sm",
}: {
  projectId: string;
  reviewId: string;
  name: string;
  size?: "sm" | "xs";
}) {
  const t = fr.strategyBriefOut.validation;
  return (
    <ConfirmButton
      label={t.withdraw(name)}
      variant="ghost"
      size={size}
      title={t.withdrawTitle(name)}
      body={t.withdrawBody}
      confirmLabel={t.withdrawConfirm}
      pendingLabel={t.withdrawPending}
      done={t.withdrawn(name)}
      run={() => withdrawStrategyReviewer(projectId, reviewId)}
    />
  );
}
