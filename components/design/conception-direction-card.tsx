import { buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { ViewLink } from "@/components/ui/view-link";
import { routes } from "@/lib/auth/redirects";
import { DESIGN_TOPICS } from "@/lib/design/intentions";
import type { DirectionState } from "@/lib/design/states";
import { fr } from "@/lib/i18n/fr";
import { designReviewTone } from "@/lib/ui/state-tones";

/**
 * The release's direction on the Conception's home (MKT-C2-03), apart from
 * the conception of each deliverable: what every deliverable shares, how
 * many of its questions are confirmed, its state, and the way into it.
 */
export function ConceptionDirectionCard({
  projectId,
  state,
  answered,
}: {
  projectId: string;
  state: DirectionState;
  answered: number;
}) {
  const t = fr.conceptionJourney;
  return (
    <section
      aria-labelledby="conception-direction"
      className="flex flex-col gap-3 rounded-2xl border border-border bg-background p-5"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3 id="conception-direction" className="text-body-lg font-semibold">
          {t.directionTitle}
        </h3>
        <StatusBadge tone={designReviewTone[state]} size="sm">
          {fr.conception.directionStates[state]}
        </StatusBadge>
      </div>
      <p className="max-w-prose text-body-md text-muted-foreground">
        {t.directionBody}
      </p>
      <p className="text-caption text-muted-foreground tabular-nums">
        {t.directionAnswered(answered, DESIGN_TOPICS.length)}
      </p>
      <div className="flex flex-wrap gap-2">
        <ViewLink
          href={routes.projectDesignWork(projectId, "direction")}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          {t.directionOpen}
        </ViewLink>
        <ViewLink
          href={routes.projectDesignDirection(projectId)}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          {fr.conception.tabs.direction}
        </ViewLink>
      </div>
    </section>
  );
}
