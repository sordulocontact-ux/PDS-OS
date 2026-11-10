import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
import { routes } from "@/lib/auth/redirects";
import { marketingReview } from "@/lib/i18n/fr/marketing-review";
import type { MarketingStanding } from "@/lib/marketing/closure/queries";
import { isMarketingClosed } from "@/lib/marketing/closure/status";
import { marketingStatusTone } from "@/lib/ui/state-tones";

const fr = { marketingReview };

const t = fr.marketingReview;

/**
 * The explicit link between the Marketing and the whole project's closing
 * (ticket « Suivi & bilan », ProjectClosureLink): where the Marketing stands,
 * the follow-ups still open, the gap made visible — the project's closing
 * never deletes a follow-up, the Marketing's never closes the project.
 */
export function MarketingClosureLink({
  projectId,
  standing,
  projectClosed,
}: {
  projectId: string;
  standing: MarketingStanding;
  projectClosed: boolean;
}) {
  const closed = isMarketingClosed(standing.status);
  const gap =
    projectClosed && standing.openFollowUps > 0
      ? t.projectLink.projectClosedGap(standing.openFollowUps)
      : !closed
        ? t.projectLink.notClosed
        : standing.openFollowUps > 0
          ? t.projectLink.closedWithFollowUps(standing.openFollowUps)
          : null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          {t.projectLink.title}
          <StatusBadge tone={marketingStatusTone[standing.status]} size="sm">
            {t.status.values[standing.status]}
          </StatusBadge>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {gap && (
          <ToneCallout tone={projectClosed || !closed ? "warning" : "neutral"}>
            {gap}
          </ToneCallout>
        )}
        <Link
          href={routes.projectReviewClosure(projectId)}
          className="text-body-sm underline underline-offset-4"
        >
          {t.projectLink.open}
        </Link>
      </CardContent>
    </Card>
  );
}
